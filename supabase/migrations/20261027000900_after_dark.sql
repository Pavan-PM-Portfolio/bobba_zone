-- =====================================================================
-- Migration 9: After Dark (private 18+ game mode for the two players)
--
-- Adds:
--   * the 'after_dark' game type
--   * a fourth entry visibility, priv:<k> - visible ONLY to its author,
--     forever. Never returned to the partner, never listed as "partner
--     answered", editable and deletable by its author.
--   * after_dark_terms(): each player's boundaries (adult + consent,
--     intensity, categories, content type) are stored as priv:setup.
--     This function returns only what BOTH accepted (lowest intensity,
--     intersection of categories), never either player's own choices.
-- =====================================================================

alter table public.sessions drop constraint if exists sessions_game_check;
alter table public.sessions add constraint sessions_game_check
  check (game in ('know_me', 'love_story', 'after_hours', 'future', 'trust', 'conflict', 'quest', 'mystery', 'story', 'after_dark'));

alter table public.session_entries drop constraint if exists session_entries_step_key_check;
alter table public.session_entries add constraint session_entries_step_key_check
  check (step_key ~ '^(pub|seal|gated|ok|priv):[A-Za-z0-9:_-]{1,80}$');

create or replace function public._entry_visible(p_session_id uuid, p_key text, p_owner smallint, p_viewer smallint)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_base text;
begin
  if p_owner = p_viewer then
    return true;
  end if;
  if p_key like 'priv:%' then
    return false;
  end if;
  if p_key like 'pub:%' or p_key like 'ok:%' then
    return true;
  end if;
  if p_key like 'seal:%' then
    return (select count(distinct player_number) = 2 from public.session_entries
             where session_id = p_session_id and step_key = p_key);
  end if;
  if p_key like 'gated:%' then
    v_base := substr(p_key, 7);
    return (select count(distinct player_number) = 2 from public.session_entries
             where session_id = p_session_id and step_key = p_key)
       and (select count(distinct player_number) = 2 from public.session_entries
             where session_id = p_session_id and step_key = 'ok:' || v_base);
  end if;
  return false;
end;
$$;

create or replace function public.create_session(p_game text, p_display_name text, p_settings jsonb default '{}'::jsonb, p_title text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := public._require_uid();
  v_name  text := public._clean_name(p_display_name);
  v_title text := public._clean_name(p_title, 60, false);
  v_id    uuid;
  v_code  text;
begin
  if p_game is null or p_game not in ('know_me', 'love_story', 'after_hours', 'future', 'trust', 'conflict', 'quest', 'mystery', 'story', 'after_dark') then
    perform public._fail('invalid_game');
  end if;
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' or pg_column_size(p_settings) > 4000 then
    perform public._fail('invalid_input');
  end if;
  if public._rate_limited(v_uid, 'create_room', interval '1 hour', 30) then
    perform public._fail('rate_limited');
  end if;
  if p_game = 'mystery' and not exists (
    select 1 from public.mystery_cases where id = coalesce(p_settings ->> 'case_id', '')
  ) then
    perform public._fail('invalid_input');
  end if;

  perform public.cleanup_expired_sessions();
  perform public._upsert_profile(v_uid, v_name);
  v_code := public._unique_invite_code();

  insert into public.sessions (game, invite_code, host_user_id, title, settings)
  values (p_game, v_code, v_uid, v_title, p_settings)
  returning id into v_id;

  insert into public.session_players (session_id, user_id, display_name, player_number)
  values (v_id, v_uid, v_name, 1);

  insert into public.rate_limit_events (user_id, action) values (v_uid, 'create_room');
  return jsonb_build_object('session_id', v_id, 'invite_code', v_code);
end;
$$;

create or replace function public.submit_entry(p_session_id uuid, p_key text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := public._require_uid();
  v_s        public.sessions := public._member_session(p_session_id, v_uid, true);
  v_seat     smallint := public._session_seat(p_session_id, v_uid);
  v_existing public.session_entries;
begin
  perform public._session_active(v_s);
  if v_s.status not in ('in_progress', 'completed') then
    perform public._fail('game_not_in_progress');
  end if;
  if p_key is null or p_key !~ '^(pub|seal|gated|ok|priv):[A-Za-z0-9:_-]{1,80}$' then
    perform public._fail('invalid_input');
  end if;
  if p_payload is null or pg_column_size(p_payload) > 7000 then
    perform public._fail('invalid_input');
  end if;

  select * into v_existing from public.session_entries
   where session_id = p_session_id and step_key = p_key and player_number = v_seat;

  if v_existing.id is not null then
    if p_key like 'seal:%' or p_key like 'gated:%' then
      if v_existing.payload = p_payload then
        return jsonb_build_object('ok', true, 'duplicate', true);
      end if;
      perform public._fail('already_submitted');
    end if;
    update public.session_entries set payload = p_payload, updated_at = now() where id = v_existing.id;
  else
    insert into public.session_entries (session_id, step_key, player_number, payload)
    values (p_session_id, p_key, v_seat, p_payload);
  end if;

  update public.sessions set updated_at = now(), expires_at = greatest(expires_at, now() + interval '30 days')
   where id = p_session_id;
  perform public._session_notify(p_session_id);
  return jsonb_build_object('ok', true, 'duplicate', false);
end;
$$;

-- Authors can remove their own public or private entries (never sealed/gated).
create or replace function public.delete_entry(p_session_id uuid, p_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public._require_uid();
  v_s    public.sessions := public._member_session(p_session_id, v_uid, true);
  v_seat smallint := public._session_seat(p_session_id, v_uid);
begin
  perform public._session_active(v_s);
  if p_key is null or not (p_key like 'pub:%' or p_key like 'priv:%') then
    perform public._fail('invalid_input');
  end if;
  delete from public.session_entries where session_id = p_session_id and step_key = p_key and player_number = v_seat;
  perform public._session_notify(p_session_id);
  return jsonb_build_object('ok', true);
end;
$$;

-- get_session: private entries are excluded from "partner_pending" so the
-- partner can't even tell when a private answer was written.
create or replace function public.get_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public._require_uid();
  v_s    public.sessions := public._member_session(p_session_id, v_uid);
  v_seat smallint := public._session_seat(p_session_id, v_uid);
begin
  update public.session_players set last_seen_at = now() where session_id = p_session_id and user_id = v_uid;

  return jsonb_build_object(
    'session', jsonb_build_object(
      'id', v_s.id, 'game', v_s.game, 'invite_code', v_s.invite_code, 'title', v_s.title,
      'status', case when v_s.status in ('waiting', 'in_progress') and v_s.expires_at < now() then 'expired' else v_s.status end,
      'settings', v_s.settings, 'state', v_s.state, 'state_version', v_s.state_version,
      'created_at', v_s.created_at, 'started_at', v_s.started_at, 'completed_at', v_s.completed_at, 'updated_at', v_s.updated_at
    ),
    'me', jsonb_build_object('player_number', v_seat, 'is_host', v_s.host_user_id = v_uid),
    'players', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'player_number', sp.player_number, 'display_name', sp.display_name,
               'is_ready', sp.is_ready, 'is_host', sp.user_id = v_s.host_user_id, 'last_seen_at', sp.last_seen_at
             ) order by sp.player_number), '[]'::jsonb)
        from public.session_players sp where sp.session_id = p_session_id
    ),
    'entries', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'key', e.step_key, 'player_number', e.player_number, 'payload', e.payload, 'at', e.updated_at
             ) order by e.created_at), '[]'::jsonb)
        from public.session_entries e
       where e.session_id = p_session_id
         and public._entry_visible(p_session_id, e.step_key, e.player_number, v_seat)
    ),
    'partner_pending', (
      select coalesce(jsonb_agg(e.step_key order by e.created_at), '[]'::jsonb)
        from public.session_entries e
       where e.session_id = p_session_id
         and e.player_number <> v_seat
         and e.step_key not like 'priv:%'
         and not public._entry_visible(p_session_id, e.step_key, e.player_number, v_seat)
    ),
    'server_time', now()
  );
end;
$$;

-- What both players accepted. Each player's priv:setup payload is
-- {adult: bool, consent: bool, level: 1-5, include: [category...], type: 'questions'|'challenges'|'mix'}.
-- Returns readiness flags and only the intersection.
create or replace function public.after_dark_terms(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := public._require_uid();
  v_s     public.sessions := public._member_session(p_session_id, v_uid);
  v_seat  smallint := public._session_seat(p_session_id, v_uid);
  v_mine  jsonb;
  v_their jsonb;
  v_ok_m  boolean;
  v_ok_t  boolean;
  v_level integer;
  v_cats  jsonb;
  v_type  text;
  v_tm    text;
  v_tt    text;
begin
  if v_s.game <> 'after_dark' then
    perform public._fail('invalid_input');
  end if;
  select payload into v_mine from public.session_entries
   where session_id = p_session_id and step_key = 'priv:setup' and player_number = v_seat;
  select payload into v_their from public.session_entries
   where session_id = p_session_id and step_key = 'priv:setup' and player_number <> v_seat;

  v_ok_m := coalesce((v_mine ->> 'adult')::boolean, false) and coalesce((v_mine ->> 'consent')::boolean, false);
  v_ok_t := coalesce((v_their ->> 'adult')::boolean, false) and coalesce((v_their ->> 'consent')::boolean, false);

  if not (v_ok_m and v_ok_t) then
    return jsonb_build_object('me_ready', v_ok_m, 'partner_ready', v_ok_t, 'agreed', false);
  end if;

  v_level := least(
    greatest(1, least(5, coalesce((v_mine ->> 'level')::integer, 1))),
    greatest(1, least(5, coalesce((v_their ->> 'level')::integer, 1)))
  );

  select coalesce(jsonb_agg(c order by c), '[]'::jsonb) into v_cats
    from (
      select jsonb_array_elements_text(coalesce(v_mine -> 'include', '[]'::jsonb)) c
      intersect
      select jsonb_array_elements_text(coalesce(v_their -> 'include', '[]'::jsonb)) c
    ) x;

  v_tm := coalesce(v_mine ->> 'type', 'mix');
  v_tt := coalesce(v_their ->> 'type', 'mix');
  v_type := case
    when v_tm = v_tt then v_tm
    when v_tm = 'mix' then v_tt
    when v_tt = 'mix' then v_tm
    else 'questions'   -- one wants only questions, the other only challenges: the gentler option
  end;

  return jsonb_build_object(
    'me_ready', true, 'partner_ready', true,
    'agreed', jsonb_array_length(v_cats) > 0,
    'level', v_level, 'categories', v_cats, 'type', v_type,
    'type_conflict', v_tm <> v_tt and v_tm <> 'mix' and v_tt <> 'mix'
  );
end;
$$;

revoke all on function public.after_dark_terms(uuid) from public, anon;
grant execute on function public.after_dark_terms(uuid) to authenticated;

-- Dashboard: include each session's mode (After Dark home uses it).
create or replace function public.get_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_uid();
begin
  return jsonb_build_object(
    'sessions', (
      select coalesce(jsonb_agg(x order by x ->> 'updated_at' desc), '[]'::jsonb) from (
        select jsonb_build_object(
          'id', s.id, 'game', s.game, 'title', s.title, 'status',
            case when s.status in ('waiting', 'in_progress') and s.expires_at < now() then 'expired' else s.status end,
          'created_at', s.created_at, 'updated_at', s.updated_at, 'completed_at', s.completed_at,
          'invite_code', s.invite_code,
          'mode', s.settings ->> 'mode',
          'my_seat', (select me.player_number from public.session_players me where me.session_id = s.id and me.user_id = v_uid),
          'players', (select jsonb_agg(jsonb_build_object('player_number', p.player_number, 'display_name', p.display_name) order by p.player_number)
                        from public.session_players p where p.session_id = s.id)
        ) as x
        from public.sessions s
        where s.status <> 'cancelled'
          and exists (select 1 from public.session_players me where me.session_id = s.id and me.user_id = v_uid)
        order by s.updated_at desc
        limit 60
      ) q
    ),
    'rooms', (
      select coalesce(jsonb_agg(x order by x ->> 'created_at' desc), '[]'::jsonb) from (
        select jsonb_build_object(
          'id', r.id, 'title', r.couple_name, 'status',
            case when r.status in ('waiting', 'in_progress') and r.expires_at < now() then 'expired' else r.status end,
          'created_at', r.created_at, 'completed_at', r.completed_at, 'invite_code', r.invite_code,
          'question_count', (select count(*) from public.game_questions gq where gq.room_id = r.id),
          'current_index', r.current_question_index,
          'agreement', (select gr.agreement_percentage from public.game_results gr where gr.room_id = r.id),
          'my_seat', (select me.player_number from public.game_players me where me.room_id = r.id and me.user_id = v_uid),
          'players', (select jsonb_agg(jsonb_build_object('player_number', p.player_number, 'display_name', p.display_name) order by p.player_number)
                        from public.game_players p where p.room_id = r.id)
        ) as x
        from public.game_rooms r
        where r.status <> 'cancelled'
          and exists (select 1 from public.game_players me where me.room_id = r.id and me.user_id = v_uid)
        order by r.created_at desc
        limit 40
      ) q
    ),
    'moments', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', m.id, 'game', m.game, 'title', m.title, 'body', m.body, 'created_at', m.created_at,
               'session_id', m.session_id, 'room_id', m.room_id, 'mine', m.created_by = v_uid
             ) order by m.created_at desc), '[]'::jsonb)
        from (select * from public.moments where v_uid = any (member_ids) order by created_at desc limit 50) m
    )
  );
end;
$$;

