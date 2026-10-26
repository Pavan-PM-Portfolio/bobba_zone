-- =====================================================================
-- Migration 10: VELVET as its own game.
-- VELVET (tap-only 18+ couples game) moves out of After Dark into its own
-- game type. It uses the same session engine, the same private priv:setup
-- boundaries and the same after_dark_terms() intersection.
-- =====================================================================

alter table public.sessions drop constraint if exists sessions_game_check;
alter table public.sessions add constraint sessions_game_check
  check (game in ('know_me', 'love_story', 'after_hours', 'future', 'trust', 'conflict', 'quest', 'mystery', 'story', 'after_dark', 'velvet'));

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
  if p_game is null or p_game not in ('know_me', 'love_story', 'after_hours', 'future', 'trust', 'conflict', 'quest', 'mystery', 'story', 'after_dark', 'velvet') then
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
  if v_s.game not in ('after_dark', 'velvet') then
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
