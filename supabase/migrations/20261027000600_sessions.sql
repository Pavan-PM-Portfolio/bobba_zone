-- =====================================================================
-- Migration 6: generic two-player game sessions for Between Us
--
-- One secure engine for games 2-10. Game rules live in the frontend; this
-- layer guarantees what must never be left to the client:
--   * only the two seated players can see or touch a session
--   * hidden answers stay hidden until the step's reveal rule is met
--   * shared state changes are compare-and-set (no lost updates)
--   * mystery clues and solutions stay on the server
--
-- Entry visibility is decided by the step key prefix:
--   pub:<k>    visible to both players immediately (board notes, story turns)
--   seal:<k>   owner only, until BOTH players have an entry for <k>
--   gated:<k>  owner only, until both have an entry for <k> AND both have
--              consented with an entry under ok:<k>
--   ok:<k>     consent marker for gated:<k> (visible to both)
-- seal:/gated: entries are immutable once written.
-- =====================================================================

create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  game          text not null check (game in ('know_me', 'love_story', 'after_hours', 'future', 'trust', 'conflict', 'quest', 'mystery', 'story')),
  invite_code   text not null unique check (invite_code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  host_user_id  uuid not null references auth.users (id) on delete cascade,
  title         text check (title is null or char_length(title) <= 60),
  status        text not null default 'waiting' check (status in ('waiting', 'in_progress', 'completed', 'cancelled')),
  settings      jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object' and pg_column_size(settings) < 8000),
  state         jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object' and pg_column_size(state) < 60000),
  state_version integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  started_at    timestamptz,
  completed_at  timestamptz,
  expires_at    timestamptz not null default (now() + interval '30 days')
);
create index if not exists sessions_status_expires_idx on public.sessions (status, expires_at);

create table if not exists public.session_players (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(btrim(display_name)) between 1 and 30),
  player_number smallint not null check (player_number in (1, 2)),
  is_ready      boolean not null default false,
  joined_at     timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  constraint session_players_one_seat_per_user unique (session_id, user_id),
  constraint session_players_unique_seat unique (session_id, player_number)
);
create index if not exists session_players_user_idx on public.session_players (user_id);

create table if not exists public.session_entries (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions (id) on delete cascade,
  step_key      text not null check (step_key ~ '^(pub|seal|gated|ok):[A-Za-z0-9:_-]{1,80}$'),
  player_number smallint not null check (player_number in (1, 2)),
  payload       jsonb not null check (pg_column_size(payload) < 8000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint session_entries_one_per_player unique (session_id, step_key, player_number)
);

create or replace function public.prevent_sealed_entry_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.step_key like 'seal:%' or old.step_key like 'gated:%' then
    raise exception 'sealed entries are immutable' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists session_entries_sealed_immutable on public.session_entries;
create trigger session_entries_sealed_immutable
  before update on public.session_entries
  for each row execute function public.prevent_sealed_entry_update();

-- Saved moments: belong to the two players of the game they came from.
create table if not exists public.moments (
  id          uuid primary key default gen_random_uuid(),
  member_ids  uuid[] not null check (cardinality(member_ids) between 1 and 2),
  created_by  uuid not null references auth.users (id) on delete cascade,
  game        text not null check (char_length(game) <= 30),
  session_id  uuid references public.sessions (id) on delete set null,
  room_id     uuid references public.game_rooms (id) on delete set null,
  title       text not null check (char_length(title) between 1 and 120),
  body        text check (body is null or char_length(body) <= 2000),
  created_at  timestamptz not null default now()
);
create index if not exists moments_members_idx on public.moments using gin (member_ids);

-- Mystery content (server-held; never selectable by clients).
create table if not exists public.mystery_cases (
  id      text primary key,
  title   text not null,
  intro   text not null,
  ending  text not null
);
create table if not exists public.mystery_chapters (
  case_id     text not null references public.mystery_cases (id) on delete cascade,
  chapter_no  smallint not null,
  title       text not null,
  scene       text not null,
  question    text not null,
  options     jsonb not null,              -- [{id, label}]
  answer_id   text not null,
  resolution  text not null,
  primary key (case_id, chapter_no)
);
create table if not exists public.mystery_clues (
  case_id       text not null,
  chapter_no    smallint not null,
  player_number smallint not null check (player_number in (1, 2)),
  clue_no       smallint not null,
  title         text not null,
  body          text not null,
  primary key (case_id, chapter_no, player_number, clue_no),
  foreign key (case_id, chapter_no) references public.mystery_chapters (case_id, chapter_no) on delete cascade
);
create table if not exists public.mystery_hints (
  case_id    text not null,
  chapter_no smallint not null,
  hint_no    smallint not null,
  body       text not null,
  primary key (case_id, chapter_no, hint_no),
  foreign key (case_id, chapter_no) references public.mystery_chapters (case_id, chapter_no) on delete cascade
);

alter table public.sessions          enable row level security;
alter table public.session_players   enable row level security;
alter table public.session_entries   enable row level security;
alter table public.moments           enable row level security;
alter table public.mystery_cases     enable row level security;
alter table public.mystery_chapters  enable row level security;
alter table public.mystery_clues     enable row level security;
alter table public.mystery_hints     enable row level security;

revoke all on public.sessions, public.session_players, public.session_entries, public.moments,
              public.mystery_cases, public.mystery_chapters, public.mystery_clues, public.mystery_hints
  from anon, authenticated;

-- ---------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------
create or replace function public._session_notify(p_session_id uuid, p_event text default 'changed')
returns void
language plpgsql
set search_path = ''
as $$
begin
  begin
    perform realtime.send(
      jsonb_build_object('session_id', p_session_id, 'event', p_event, 'at', now()),
      p_event, 'session:' || p_session_id::text, true);
  exception when others then
    null;
  end;
end;
$$;

-- Load a session the caller is seated in (same error whether missing or not theirs).
create or replace function public._member_session(p_session_id uuid, p_uid uuid, p_lock boolean default false)
returns public.sessions
language plpgsql
set search_path = ''
as $$
declare
  v public.sessions;
begin
  if p_session_id is null
     or not exists (select 1 from public.session_players sp where sp.session_id = p_session_id and sp.user_id = p_uid) then
    perform public._fail('session_not_found');
  end if;
  if p_lock then
    select * into v from public.sessions where id = p_session_id for update;
  else
    select * into v from public.sessions where id = p_session_id;
  end if;
  if v.id is null then
    perform public._fail('session_not_found');
  end if;
  return v;
end;
$$;

create or replace function public._session_seat(p_session_id uuid, p_uid uuid)
returns smallint
language sql
stable
set search_path = ''
as $$
  select player_number from public.session_players where session_id = p_session_id and user_id = p_uid;
$$;

create or replace function public._session_active(p public.sessions)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p.status = 'cancelled' then
    perform public._fail('session_not_active');
  end if;
  if p.status in ('waiting', 'in_progress') and p.expires_at < now() then
    perform public._fail('session_expired');
  end if;
end;
$$;

-- Is an entry by `p_owner` under `p_key` visible to `p_viewer`?
create or replace function public._entry_visible(p_session_id uuid, p_key text, p_owner smallint, p_viewer smallint)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_base text;
begin
  if p_owner = p_viewer or p_key like 'pub:%' or p_key like 'ok:%' then
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

create or replace function public._unique_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v text;
  i integer := 0;
begin
  loop
    i := i + 1;
    v := public._generate_invite_code();
    exit when not exists (select 1 from public.game_rooms where invite_code = v)
          and not exists (select 1 from public.sessions where invite_code = v);
    if i > 8 then
      perform public._fail('try_again');
    end if;
  end loop;
  return v;
end;
$$;

create or replace function public.cleanup_expired_sessions()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.sessions set status = 'cancelled'
   where status in ('waiting', 'in_progress') and expires_at < now();
  delete from public.sessions where status = 'cancelled' and expires_at < now() - interval '7 days';
  delete from public.sessions where status = 'completed' and completed_at < now() - interval '365 days';
$$;

-- ---------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------
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
  if p_game is null or p_game not in ('know_me', 'love_story', 'after_hours', 'future', 'trust', 'conflict', 'quest', 'mystery', 'story') then
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

-- Unified join: works for both the original rooms and the new sessions,
-- with one generic failure answer and one rate limit.
create or replace function public.join_any(p_invite_code text, p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := public._require_uid();
  v_name  text := public._clean_name(p_display_name);
  v_code  text := public._normalize_invite_code(p_invite_code);
  v_s     public.sessions;
  v_seat  smallint;
  v_count integer;
  v_res   jsonb;
begin
  if public._rate_limited(v_uid, 'join_failed', interval '15 minutes', 10) then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  if exists (select 1 from public.game_rooms where invite_code = v_code) then
    v_res := public.join_room(v_code, v_name);
    return v_res || jsonb_build_object('kind', 'room');
  end if;

  select * into v_s from public.sessions where invite_code = v_code for update;

  if v_s.id is null or v_s.status = 'cancelled' then
    insert into public.rate_limit_events (user_id, action) values (v_uid, 'join_failed');
    return jsonb_build_object('ok', false, 'error', 'room_unavailable');
  end if;

  v_seat := public._session_seat(v_s.id, v_uid);
  if v_seat is not null then
    update public.session_players set last_seen_at = now() where session_id = v_s.id and user_id = v_uid;
    return jsonb_build_object('ok', true, 'kind', 'session', 'session_id', v_s.id, 'player_number', v_seat, 'rejoined', true);
  end if;

  select count(*) into v_count from public.session_players where session_id = v_s.id;
  if v_s.status <> 'waiting' or v_s.expires_at < now() or v_count >= 2 then
    insert into public.rate_limit_events (user_id, action) values (v_uid, 'join_failed');
    return jsonb_build_object('ok', false, 'error', 'room_unavailable');
  end if;

  perform public._upsert_profile(v_uid, v_name);
  insert into public.session_players (session_id, user_id, display_name, player_number)
  values (v_s.id, v_uid, v_name, 2);
  update public.sessions set updated_at = now() where id = v_s.id;
  perform public._session_notify(v_s.id, 'player_joined');
  return jsonb_build_object('ok', true, 'kind', 'session', 'session_id', v_s.id, 'player_number', 2, 'rejoined', false);
end;
$$;

create or replace function public.set_session_ready(p_session_id uuid, p_ready boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_uid();
  v_s   public.sessions := public._member_session(p_session_id, v_uid, true);
begin
  perform public._session_active(v_s);
  if v_s.status <> 'waiting' then
    perform public._fail('room_not_waiting');
  end if;
  update public.session_players set is_ready = coalesce(p_ready, false), last_seen_at = now()
   where session_id = p_session_id and user_id = v_uid;
  perform public._session_notify(p_session_id);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.start_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := public._require_uid();
  v_s     public.sessions := public._member_session(p_session_id, v_uid, true);
  v_seats integer;
  v_ready integer;
begin
  if v_s.status = 'in_progress' then
    return jsonb_build_object('ok', true, 'already_started', true);
  end if;
  perform public._session_active(v_s);
  if v_s.host_user_id <> v_uid then
    perform public._fail('host_only');
  end if;
  if v_s.status <> 'waiting' then
    perform public._fail('room_not_waiting');
  end if;
  select count(*), count(*) filter (where is_ready) into v_seats, v_ready
    from public.session_players where session_id = p_session_id;
  if v_seats <> 2 then
    perform public._fail('waiting_for_partner');
  end if;
  if v_ready <> 2 then
    perform public._fail('players_not_ready');
  end if;
  update public.sessions
     set status = 'in_progress', started_at = now(), updated_at = now(), expires_at = now() + interval '30 days'
   where id = p_session_id;
  perform public._session_notify(p_session_id, 'started');
  return jsonb_build_object('ok', true, 'already_started', false);
end;
$$;

-- The authorised read model. Hidden entries are never included; the
-- partner's pending keys are listed WITHOUT payloads ("partner answered").
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
         and not public._entry_visible(p_session_id, e.step_key, e.player_number, v_seat)
    ),
    'server_time', now()
  );
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
  if p_key is null or p_key !~ '^(pub|seal|gated|ok):[A-Za-z0-9:_-]{1,80}$' then
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

-- Remove one of your own *public* entries (e.g. a board note). Sealed and
-- gated entries can never be removed or changed.
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
  if p_key is null or p_key not like 'pub:%' then
    perform public._fail('invalid_input');
  end if;
  delete from public.session_entries where session_id = p_session_id and step_key = p_key and player_number = v_seat;
  perform public._session_notify(p_session_id);
  return jsonb_build_object('ok', true);
end;
$$;

-- Shared state: shallow-merge `p_patch` into state if the caller's version
-- is current. Returns {ok, version} or {ok:false, conflict:true, version}.
create or replace function public.update_session_state(p_session_id uuid, p_patch jsonb, p_expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_uid();
  v_s   public.sessions := public._member_session(p_session_id, v_uid, true);
begin
  perform public._session_active(v_s);
  if v_s.status <> 'in_progress' then
    perform public._fail('game_not_in_progress');
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or pg_column_size(p_patch) > 16000 then
    perform public._fail('invalid_input');
  end if;
  -- mystery progress is server-controlled
  if v_s.game = 'mystery' and (p_patch ? 'chapter' or p_patch ? 'solved' or p_patch ? 'attempts') then
    perform public._fail('invalid_input');
  end if;
  if p_expected_version is distinct from v_s.state_version then
    return jsonb_build_object('ok', false, 'conflict', true, 'version', v_s.state_version);
  end if;
  update public.sessions
     set state = state || p_patch, state_version = state_version + 1, updated_at = now(),
         expires_at = greatest(expires_at, now() + interval '30 days')
   where id = p_session_id;
  perform public._session_notify(p_session_id);
  return jsonb_build_object('ok', true, 'version', v_s.state_version + 1);
end;
$$;

create or replace function public.complete_session(p_session_id uuid, p_title text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := public._require_uid();
  v_s     public.sessions := public._member_session(p_session_id, v_uid, true);
  v_title text := public._clean_name(p_title, 60, false);
begin
  if v_s.status = 'completed' then
    if v_title is not null then
      update public.sessions set title = v_title, updated_at = now() where id = p_session_id;
      perform public._session_notify(p_session_id);
    end if;
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  perform public._session_active(v_s);
  if v_s.status <> 'in_progress' then
    perform public._fail('game_not_in_progress');
  end if;
  update public.sessions
     set status = 'completed', completed_at = now(), updated_at = now(), title = coalesce(v_title, title)
   where id = p_session_id;
  perform public._session_notify(p_session_id, 'completed');
  return jsonb_build_object('ok', true, 'already', false);
end;
$$;

create or replace function public.rename_session(p_session_id uuid, p_title text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := public._require_uid();
  v_s     public.sessions := public._member_session(p_session_id, v_uid, true);
  v_title text := public._clean_name(p_title, 60, true);
begin
  update public.sessions set title = v_title, updated_at = now() where id = v_s.id;
  perform public._session_notify(p_session_id);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.cancel_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_uid();
  v_s   public.sessions := public._member_session(p_session_id, v_uid, true);
begin
  if v_s.status not in ('waiting', 'in_progress') then
    perform public._fail('session_not_active');
  end if;
  update public.sessions set status = 'cancelled', updated_at = now() where id = p_session_id;
  perform public._session_notify(p_session_id, 'cancelled');
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.delete_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_uid();
  v_s   public.sessions := public._member_session(p_session_id, v_uid, true);
begin
  perform public._session_notify(p_session_id, 'deleted');
  delete from public.sessions where id = v_s.id;
  return jsonb_build_object('ok', true);
end;
$$;

-- Everything on the caller's dashboard in one call (no fabricated data:
-- only real rows the caller belongs to).
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

create or replace function public.save_moment(p_game text, p_title text, p_body text default null, p_session_id uuid default null, p_room_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := public._require_uid();
  v_members uuid[];
  v_id      uuid;
begin
  if p_title is null or char_length(btrim(p_title)) not between 1 and 120
     or (p_body is not null and char_length(p_body) > 2000)
     or p_game is null or char_length(p_game) > 30 then
    perform public._fail('invalid_input');
  end if;
  if p_session_id is not null then
    perform public._member_session(p_session_id, v_uid);
    select array_agg(user_id) into v_members from public.session_players where session_id = p_session_id;
  elsif p_room_id is not null then
    perform public._member_room(p_room_id, v_uid);
    select array_agg(user_id) into v_members from public.game_players where room_id = p_room_id;
  else
    perform public._fail('invalid_input');
  end if;
  insert into public.moments (member_ids, created_by, game, session_id, room_id, title, body)
  values (v_members, v_uid, p_game, p_session_id, p_room_id, btrim(p_title), nullif(btrim(coalesce(p_body, '')), ''))
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.delete_moment(p_moment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_uid();
begin
  delete from public.moments where id = p_moment_id and v_uid = any (member_ids);
  if not found then
    perform public._fail('not_found');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- Mystery: clues and answers live here, not in the browser bundle.
-- state.chapter (1-based) and state.solved are written only by this code.
-- ---------------------------------------------------------------------
create or replace function public.get_mystery(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := public._require_uid();
  v_s       public.sessions := public._member_session(p_session_id, v_uid);
  v_seat    smallint := public._session_seat(p_session_id, v_uid);
  v_case    text := v_s.settings ->> 'case_id';
  v_chapter integer := coalesce((v_s.state ->> 'chapter')::integer, 1);
  v_total   integer;
  v_c       public.mystery_cases;
begin
  if v_s.game <> 'mystery' then
    perform public._fail('invalid_input');
  end if;
  select * into v_c from public.mystery_cases where id = v_case;
  select count(*) into v_total from public.mystery_chapters where case_id = v_case;

  return jsonb_build_object(
    'case', jsonb_build_object('id', v_c.id, 'title', v_c.title, 'intro', v_c.intro,
                               'ending', case when (v_s.state ->> 'solved')::boolean then v_c.ending end),
    'chapter', v_chapter,
    'total_chapters', v_total,
    'solved', coalesce((v_s.state ->> 'solved')::boolean, false),
    'chapters', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'no', ch.chapter_no, 'title', ch.title, 'scene', ch.scene, 'question', ch.question, 'options', ch.options,
               'resolution', case when ch.chapter_no < v_chapter or (v_s.state ->> 'solved')::boolean then ch.resolution end,
               'my_clues', (select coalesce(jsonb_agg(jsonb_build_object('no', cl.clue_no, 'title', cl.title, 'body', cl.body) order by cl.clue_no), '[]'::jsonb)
                              from public.mystery_clues cl
                             where cl.case_id = v_case and cl.chapter_no = ch.chapter_no and cl.player_number = v_seat),
               'partner_clue_count', (select count(*) from public.mystery_clues cl
                             where cl.case_id = v_case and cl.chapter_no = ch.chapter_no and cl.player_number <> v_seat),
               'hints', (select coalesce(jsonb_agg(h.body order by h.hint_no), '[]'::jsonb)
                           from public.mystery_hints h
                          where h.case_id = v_case and h.chapter_no = ch.chapter_no
                            and h.hint_no <= coalesce((v_s.state -> 'hints' ->> ch.chapter_no::text)::integer, 0)),
               'hints_available', (select count(*) from public.mystery_hints h where h.case_id = v_case and h.chapter_no = ch.chapter_no),
               'attempts', coalesce((v_s.state -> 'attempts' ->> ch.chapter_no::text)::integer, 0)
             ) order by ch.chapter_no), '[]'::jsonb)
        from public.mystery_chapters ch
       where ch.case_id = v_case and ch.chapter_no <= v_chapter
    )
  );
end;
$$;

create or replace function public.mystery_hint(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := public._require_uid();
  v_s       public.sessions := public._member_session(p_session_id, v_uid, true);
  v_case    text := v_s.settings ->> 'case_id';
  v_chapter integer := coalesce((v_s.state ->> 'chapter')::integer, 1);
  v_used    integer := coalesce((v_s.state -> 'hints' ->> v_chapter::text)::integer, 0);
  v_avail   integer;
begin
  perform public._session_active(v_s);
  if v_s.game <> 'mystery' or v_s.status <> 'in_progress' then
    perform public._fail('game_not_in_progress');
  end if;
  select count(*) into v_avail from public.mystery_hints where case_id = v_case and chapter_no = v_chapter;
  if v_used >= v_avail then
    return jsonb_build_object('ok', false, 'error', 'no_more_hints');
  end if;
  update public.sessions
     set state = jsonb_set(state, '{hints}', coalesce(state -> 'hints', '{}'::jsonb) || jsonb_build_object(v_chapter::text, v_used + 1)),
         state_version = state_version + 1, updated_at = now()
   where id = p_session_id;
  perform public._session_notify(p_session_id);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.mystery_answer(p_session_id uuid, p_option_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := public._require_uid();
  v_s       public.sessions := public._member_session(p_session_id, v_uid, true);
  v_case    text := v_s.settings ->> 'case_id';
  v_chapter integer := coalesce((v_s.state ->> 'chapter')::integer, 1);
  v_ch      public.mystery_chapters;
  v_total   integer;
  v_tries   integer;
  v_correct boolean;
begin
  perform public._session_active(v_s);
  if v_s.game <> 'mystery' or v_s.status <> 'in_progress' then
    perform public._fail('game_not_in_progress');
  end if;
  if coalesce((v_s.state ->> 'solved')::boolean, false) then
    return jsonb_build_object('ok', true, 'correct', true, 'solved', true);
  end if;
  select * into v_ch from public.mystery_chapters where case_id = v_case and chapter_no = v_chapter;
  if p_option_id is null or not exists (select 1 from jsonb_array_elements(v_ch.options) o where o ->> 'id' = p_option_id) then
    perform public._fail('invalid_choice');
  end if;
  select count(*) into v_total from public.mystery_chapters where case_id = v_case;
  v_tries := coalesce((v_s.state -> 'attempts' ->> v_chapter::text)::integer, 0) + 1;
  v_correct := p_option_id = v_ch.answer_id;

  update public.sessions
     set state = jsonb_set(state, '{attempts}', coalesce(state -> 'attempts', '{}'::jsonb) || jsonb_build_object(v_chapter::text, v_tries))
               || case when v_correct and v_chapter >= v_total then jsonb_build_object('solved', true)
                       when v_correct then jsonb_build_object('chapter', v_chapter + 1)
                       else '{}'::jsonb end,
         state_version = state_version + 1, updated_at = now()
   where id = p_session_id;

  perform public._session_notify(p_session_id, case when v_correct then 'mystery_progress' else 'changed' end);
  return jsonb_build_object('ok', true, 'correct', v_correct, 'solved', v_correct and v_chapter >= v_total);
end;
$$;

-- ---------------------------------------------------------------------
-- Realtime: session channels ("session:<uuid>") for seated players only.
-- ---------------------------------------------------------------------
create or replace function public.is_room_channel_member(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    return false;
  end if;
  if p_topic ~ '^room:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_id := substr(p_topic, 6)::uuid;
    return exists (select 1 from public.game_players gp where gp.room_id = v_id and gp.user_id = auth.uid());
  elsif p_topic ~ '^session:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_id := substr(p_topic, 9)::uuid;
    return exists (select 1 from public.session_players sp where sp.session_id = v_id and sp.user_id = auth.uid());
  end if;
  return false;
end;
$$;

-- ---------------------------------------------------------------------
-- privileges
-- ---------------------------------------------------------------------
revoke all on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.create_room(text, text, text, text[]),
  public.join_room(text, text),
  public.set_ready(uuid, boolean),
  public.update_display_name(uuid, text),
  public.start_game(uuid),
  public.submit_answer(uuid, uuid, integer),
  public.reveal_question(uuid, uuid),
  public.skip_question(uuid, uuid, boolean),
  public.advance_question(uuid, integer),
  public.get_game_state(uuid),
  public.get_completed_results(uuid),
  public.get_history(integer),
  public.delete_game_session(uuid),
  public.cancel_room(uuid),
  public.play_again(uuid),
  public.is_room_channel_member(text),
  public.create_session(text, text, jsonb, text),
  public.join_any(text, text),
  public.set_session_ready(uuid, boolean),
  public.start_session(uuid),
  public.get_session(uuid),
  public.submit_entry(uuid, text, jsonb),
  public.delete_entry(uuid, text),
  public.update_session_state(uuid, jsonb, integer),
  public.complete_session(uuid, text),
  public.rename_session(uuid, text),
  public.cancel_session(uuid),
  public.delete_session(uuid),
  public.get_dashboard(),
  public.save_moment(text, text, text, uuid, uuid),
  public.delete_moment(uuid),
  public.get_mystery(uuid),
  public.mystery_hint(uuid),
  public.mystery_answer(uuid, text)
to authenticated;
