-- =====================================================================
-- Migration 2: server-authoritative game logic (RPC functions)
--
-- Every public RPC:
--   * is SECURITY DEFINER with search_path = '' (all names schema-qualified)
--   * derives the caller ONLY from auth.uid() - never from arguments
--   * verifies room membership before touching room data
--   * validates every input
--   * raises errors with a short machine code as the message
--     (the frontend maps codes to friendly copy)
--
-- Realtime: functions broadcast SAFE events (no answer contents) to the
-- private channel "room:<room_id>". Clients refetch state via
-- get_game_state(), which applies the privacy rules.
-- =====================================================================

-- ---------------------------------------------------------------------
-- internal helpers (not executable by clients)
-- ---------------------------------------------------------------------

create or replace function public._fail(p_code text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception '%', p_code using errcode = 'P0001';
end;
$$;

create or replace function public._require_uid()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    perform public._fail('not_authenticated');
  end if;
  return v_uid;
end;
$$;

-- Trim, collapse whitespace, strip control characters, enforce 1..30 chars.
create or replace function public._clean_name(p_name text, p_max integer default 30, p_required boolean default true)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text;
begin
  v := regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g');
  v := btrim(regexp_replace(v, '\s+', ' ', 'g'));
  if v = '' then
    if p_required then
      perform public._fail('invalid_name');
    end if;
    return null;
  end if;
  if char_length(v) > p_max then
    perform public._fail('invalid_name');
  end if;
  return v;
end;
$$;

-- 8 characters from a 32-symbol alphabet without look-alikes (no 0/O/1/I).
-- 32^8 ~ 1.1 trillion codes. Randomness comes from gen_random_uuid(),
-- which uses the server's cryptographically strong RNG.
create or replace function public._generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea := uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid());
  v_code text := '';
  i integer;
begin
  -- skip the version/variant bytes (6 and 8) of each uuid
  for i in 0..15 loop
    continue when i in (6, 8);
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    exit when char_length(v_code) = 8;
  end loop;
  return v_code;
end;
$$;

-- Normalise user-entered codes: uppercase, drop spaces/dashes.
create or replace function public._normalize_invite_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g');
$$;

-- Broadcast a safe event to the room's private Realtime channel.
-- Never include answer contents in p_payload. Failures here must never
-- break game logic, so they are swallowed (clients also poll).
create or replace function public._notify_room(p_room_id uuid, p_event text, p_payload jsonb default '{}'::jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  begin
    perform realtime.send(
      p_payload || jsonb_build_object('room_id', p_room_id, 'event', p_event, 'at', now()),
      p_event,
      'room:' || p_room_id::text,
      true
    );
  exception when others then
    null;
  end;
end;
$$;

create or replace function public._upsert_profile(p_uid uuid, p_name text)
returns void
language sql
set search_path = ''
as $$
  insert into public.profiles (id, display_name)
  values (p_uid, p_name)
  on conflict (id) do update
    set display_name = excluded.display_name,
        updated_at = now();
$$;

-- Returns true when the user has hit the limit for an action in the window.
create or replace function public._rate_limited(p_uid uuid, p_action text, p_window interval, p_max integer)
returns boolean
language sql
stable
set search_path = ''
as $$
  select count(*) >= p_max
  from public.rate_limit_events
  where user_id = p_uid
    and action = p_action
    and created_at > now() - p_window;
$$;

create or replace function public._is_expired(p_room public.game_rooms)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_room.status in ('waiting', 'in_progress') and p_room.expires_at < now();
$$;

-- Load and lock a room the caller belongs to. Raises when the room does not
-- exist or the caller is not seated (same error for both - no probing).
create or replace function public._member_room(p_room_id uuid, p_uid uuid, p_lock text default 'none')
returns public.game_rooms
language plpgsql
set search_path = ''
as $$
declare
  v_room public.game_rooms;
begin
  if p_room_id is null then
    perform public._fail('room_not_found');
  end if;

  if not exists (
    select 1 from public.game_players gp where gp.room_id = p_room_id and gp.user_id = p_uid
  ) then
    perform public._fail('room_not_found');
  end if;

  if p_lock = 'update' then
    select * into v_room from public.game_rooms where id = p_room_id for update;
  elsif p_lock = 'share' then
    select * into v_room from public.game_rooms where id = p_room_id for share;
  else
    select * into v_room from public.game_rooms where id = p_room_id;
  end if;

  if v_room.id is null then
    perform public._fail('room_not_found');
  end if;
  return v_room;
end;
$$;

create or replace function public._player(p_room_id uuid, p_uid uuid)
returns public.game_players
language sql
stable
set search_path = ''
as $$
  select * from public.game_players where room_id = p_room_id and user_id = p_uid;
$$;

-- Pick questions for a room: random order WITHIN each selected round,
-- rounds kept in canonical order, no duplicates (unique constraint).
create or replace function public._seed_room_questions(p_room_id uuid, p_rounds text[], p_per_round integer)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.game_questions (room_id, question_id, question_index)
  select p_room_id, picked.id, (row_number() over (order by r.ord, picked.rnd) - 1)::integer
  from unnest(p_rounds) with ordinality as r(category, ord)
  cross join lateral (
    select q.id, random() as rnd
    from public.questions q
    where q.category = r.category and q.is_active
    order by random()
    limit p_per_round
  ) as picked;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Recompute results purely from answers + game_questions (reproducible).
create or replace function public._compute_results(p_room_id uuid)
returns public.game_results
language plpgsql
set search_path = ''
as $$
declare
  v_result public.game_results;
begin
  with per_question as (
    select
      gq.id,
      gq.status,
      q.category,
      (
        select count(distinct a.selected_player_number) = 1 and count(*) = 2
        from public.answers a
        where a.game_question_id = gq.id
      ) as matched
    from public.game_questions gq
    join public.questions q on q.id = gq.question_id
    where gq.room_id = p_room_id
  ),
  totals as (
    select
      count(*) filter (where status = 'revealed') as answered,
      count(*) filter (where status = 'skipped') as skipped,
      count(*) filter (where status = 'revealed' and matched) as matching
    from per_question
  ),
  rounds as (
    select coalesce(jsonb_agg(jsonb_build_object(
             'category', category,
             'answered', answered,
             'matching', matching,
             'skipped', skipped
           ) order by array_position(array['romance','chaotic','understanding','future'], category)), '[]'::jsonb) as breakdown
    from (
      select category,
             count(*) filter (where status = 'revealed') as answered,
             count(*) filter (where status = 'revealed' and matched) as matching,
             count(*) filter (where status = 'skipped') as skipped
      from per_question
      group by category
    ) g
  )
  insert into public.game_results as gr
    (room_id, questions_answered, questions_skipped, matching_answers, agreement_percentage, round_breakdown, completed_at)
  select
    p_room_id,
    t.answered,
    t.skipped,
    t.matching,
    case when t.answered = 0 then 0 else round(t.matching::numeric * 100 / t.answered, 2) end,
    r.breakdown,
    now()
  from totals t cross join rounds r
  on conflict (room_id) do update
    set questions_answered   = excluded.questions_answered,
        questions_skipped    = excluded.questions_skipped,
        matching_answers     = excluded.matching_answers,
        agreement_percentage = excluded.agreement_percentage,
        round_breakdown      = excluded.round_breakdown
  returning * into v_result;

  return v_result;
end;
$$;

-- Housekeeping: expire abandoned rooms and apply retention.
-- Called opportunistically from create_room and schedulable with pg_cron.
create or replace function public.cleanup_expired_rooms()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expired integer;
  v_deleted integer;
  v_old integer;
begin
  update public.game_rooms
     set status = 'cancelled'
   where status in ('waiting', 'in_progress')
     and expires_at < now();
  get diagnostics v_expired = row_count;

  -- cancelled rooms are purged after 7 days
  delete from public.game_rooms
   where status = 'cancelled'
     and expires_at < now() - interval '7 days';
  get diagnostics v_deleted = row_count;

  -- completed sessions are kept for 365 days (history retention)
  delete from public.game_rooms
   where status = 'completed'
     and completed_at < now() - interval '365 days';
  get diagnostics v_old = row_count;

  delete from public.rate_limit_events where created_at < now() - interval '1 day';

  return jsonb_build_object('expired', v_expired, 'purged_cancelled', v_deleted, 'purged_completed', v_old);
end;
$$;

-- =====================================================================
-- Public RPCs
-- =====================================================================

-- ---------------------------------------------------------------------
-- create_room
-- ---------------------------------------------------------------------
create or replace function public.create_room(
  p_display_name text,
  p_couple_name  text default null,
  p_mode         text default 'standard',
  p_rounds       text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid        uuid := public._require_uid();
  v_name       text := public._clean_name(p_display_name);
  v_couple     text := public._clean_name(p_couple_name, 40, false);
  v_all_rounds constant text[] := array['romance', 'chaotic', 'understanding', 'future'];
  v_rounds     text[];
  v_per_round  integer;
  v_room_id    uuid;
  v_code       text;
  v_count      integer;
  v_attempt    integer := 0;
begin
  if p_mode not in ('quick', 'standard', 'full') then
    perform public._fail('invalid_mode');
  end if;
  v_per_round := case p_mode when 'quick' then 3 when 'standard' then 6 else 15 end;

  if p_rounds is null or cardinality(p_rounds) = 0 then
    v_rounds := v_all_rounds;
  else
    if exists (select 1 from unnest(p_rounds) r where r is null or not (r = any (v_all_rounds))) then
      perform public._fail('invalid_rounds');
    end if;
    -- dedupe + canonical order
    select array_agg(r order by array_position(v_all_rounds, r))
      into v_rounds
      from (select distinct r from unnest(p_rounds) r) d;
  end if;

  if public._rate_limited(v_uid, 'create_room', interval '1 hour', 20) then
    perform public._fail('rate_limited');
  end if;

  perform public.cleanup_expired_rooms();
  perform public._upsert_profile(v_uid, v_name);

  loop
    v_attempt := v_attempt + 1;
    v_code := public._generate_invite_code();
    begin
      insert into public.game_rooms (invite_code, host_user_id, couple_name, settings)
      values (
        v_code, v_uid, v_couple,
        jsonb_build_object('mode', p_mode, 'rounds', to_jsonb(v_rounds), 'per_round', v_per_round)
      )
      returning id into v_room_id;
      exit;
    exception when unique_violation then
      if v_attempt >= 5 then
        perform public._fail('try_again');
      end if;
    end;
  end loop;

  insert into public.game_players (room_id, user_id, display_name, player_number, is_ready)
  values (v_room_id, v_uid, v_name, 1, false);

  v_count := public._seed_room_questions(v_room_id, v_rounds, v_per_round);
  if v_count = 0 then
    perform public._fail('no_questions');
  end if;

  update public.game_rooms
     set settings = settings || jsonb_build_object('question_count', v_count)
   where id = v_room_id;

  insert into public.rate_limit_events (user_id, action) values (v_uid, 'create_room');

  return jsonb_build_object('room_id', v_room_id, 'invite_code', v_code);
end;
$$;

-- ---------------------------------------------------------------------
-- join_room
-- Returns {ok:true, room_id} or {ok:false, error}. It returns instead of
-- raising so failed attempts are recorded for rate limiting. All
-- "can't join" cases share one generic error to prevent code probing.
-- ---------------------------------------------------------------------
create or replace function public.join_room(p_invite_code text, p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := public._require_uid();
  v_name    text := public._clean_name(p_display_name);
  v_code    text := public._normalize_invite_code(p_invite_code);
  v_room    public.game_rooms;
  v_me      public.game_players;
  v_seats   integer;
  v_free    smallint;
begin
  if public._rate_limited(v_uid, 'join_failed', interval '15 minutes', 10) then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  if v_code !~ '^[A-HJ-NP-Z2-9]{8}$' then
    insert into public.rate_limit_events (user_id, action) values (v_uid, 'join_failed');
    return jsonb_build_object('ok', false, 'error', 'room_unavailable');
  end if;

  select * into v_room from public.game_rooms where invite_code = v_code for update;

  if v_room.id is null or v_room.status = 'cancelled' then
    insert into public.rate_limit_events (user_id, action) values (v_uid, 'join_failed');
    return jsonb_build_object('ok', false, 'error', 'room_unavailable');
  end if;

  -- Reconnect: the caller already holds a seat -> same seat, never a new one.
  v_me := public._player(v_room.id, v_uid);
  if v_me.id is not null then
    update public.game_players set last_seen_at = now() where id = v_me.id;
    return jsonb_build_object('ok', true, 'room_id', v_room.id, 'player_number', v_me.player_number, 'rejoined', true);
  end if;

  if v_room.status <> 'waiting' or public._is_expired(v_room) then
    insert into public.rate_limit_events (user_id, action) values (v_uid, 'join_failed');
    return jsonb_build_object('ok', false, 'error', 'room_unavailable');
  end if;

  select count(*) into v_seats from public.game_players where room_id = v_room.id;
  if v_seats >= 2 then
    insert into public.rate_limit_events (user_id, action) values (v_uid, 'join_failed');
    return jsonb_build_object('ok', false, 'error', 'room_unavailable');
  end if;

  select n into v_free
    from unnest(array[1, 2]::smallint[]) n
   where not exists (select 1 from public.game_players gp where gp.room_id = v_room.id and gp.player_number = n)
   order by n
   limit 1;

  perform public._upsert_profile(v_uid, v_name);

  insert into public.game_players (room_id, user_id, display_name, player_number, is_ready)
  values (v_room.id, v_uid, v_name, v_free, false);

  update public.game_rooms set expires_at = greatest(expires_at, now() + interval '24 hours') where id = v_room.id;

  perform public._notify_room(v_room.id, 'player_joined', jsonb_build_object('player_number', v_free));

  return jsonb_build_object('ok', true, 'room_id', v_room.id, 'player_number', v_free, 'rejoined', false);
end;
$$;

-- ---------------------------------------------------------------------
-- set_ready
-- ---------------------------------------------------------------------
create or replace function public.set_ready(p_room_id uuid, p_ready boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public._require_uid();
  v_room public.game_rooms := public._member_room(p_room_id, v_uid, 'update');
  v_me   public.game_players;
begin
  if p_ready is null then
    perform public._fail('invalid_input');
  end if;
  if v_room.status <> 'waiting' then
    perform public._fail('room_not_waiting');
  end if;
  if public._is_expired(v_room) then
    perform public._fail('room_expired');
  end if;

  update public.game_players
     set is_ready = p_ready, last_seen_at = now()
   where room_id = p_room_id and user_id = v_uid
  returning * into v_me;

  perform public._notify_room(p_room_id, 'ready_changed',
    jsonb_build_object('player_number', v_me.player_number, 'is_ready', p_ready));

  return jsonb_build_object('ok', true, 'is_ready', p_ready);
end;
$$;

-- ---------------------------------------------------------------------
-- update_display_name (in lobby)
-- ---------------------------------------------------------------------
create or replace function public.update_display_name(p_room_id uuid, p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public._require_uid();
  v_name text := public._clean_name(p_display_name);
  v_room public.game_rooms := public._member_room(p_room_id, v_uid, 'update');
begin
  if v_room.status <> 'waiting' then
    perform public._fail('room_not_waiting');
  end if;
  update public.game_players set display_name = v_name, last_seen_at = now()
   where room_id = p_room_id and user_id = v_uid;
  perform public._upsert_profile(v_uid, v_name);
  perform public._notify_room(p_room_id, 'player_updated');
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- start_game (host only, both seated and ready). Idempotent.
-- ---------------------------------------------------------------------
create or replace function public.start_game(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := public._require_uid();
  v_room  public.game_rooms := public._member_room(p_room_id, v_uid, 'update');
  v_seats integer;
  v_ready integer;
begin
  if v_room.status = 'in_progress' then
    return jsonb_build_object('ok', true, 'already_started', true);
  end if;
  if v_room.host_user_id <> v_uid then
    perform public._fail('host_only');
  end if;
  if v_room.status <> 'waiting' then
    perform public._fail('room_not_waiting');
  end if;
  if public._is_expired(v_room) then
    perform public._fail('room_expired');
  end if;

  select count(*), count(*) filter (where is_ready)
    into v_seats, v_ready
    from public.game_players where room_id = p_room_id;

  if v_seats <> 2 then
    perform public._fail('waiting_for_partner');
  end if;
  if v_ready <> 2 then
    perform public._fail('players_not_ready');
  end if;

  update public.game_rooms
     set status = 'in_progress',
         current_question_index = 0,
         started_at = now(),
         expires_at = now() + interval '24 hours'
   where id = p_room_id;

  perform public._notify_room(p_room_id, 'game_started', jsonb_build_object('question_index', 0));
  return jsonb_build_object('ok', true, 'already_started', false);
end;
$$;

-- Shared validation for actions on the current question.
-- Locks the room (share) then the question row (update) in a fixed order so
-- concurrent submit/skip/advance calls serialise without deadlocks.
create or replace function public._current_question_for_action(p_room_id uuid, p_uid uuid, p_game_question_id uuid)
returns public.game_questions
language plpgsql
set search_path = ''
as $$
declare
  v_room public.game_rooms := public._member_room(p_room_id, p_uid, 'share');
  v_gq   public.game_questions;
begin
  if v_room.status <> 'in_progress' then
    perform public._fail('game_not_in_progress');
  end if;
  if public._is_expired(v_room) then
    perform public._fail('room_expired');
  end if;

  select * into v_gq
    from public.game_questions
   where id = p_game_question_id and room_id = p_room_id
   for update;

  if v_gq.id is null then
    perform public._fail('question_not_found');
  end if;
  if v_gq.question_index <> v_room.current_question_index then
    perform public._fail('question_not_current');
  end if;
  return v_gq;
end;
$$;

-- Reveal if (and only if) both players have answered. Caller must hold the
-- question row lock. Returns true when the question is now revealed.
create or replace function public._try_reveal(p_gq public.game_questions)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_answers integer;
begin
  if p_gq.status = 'revealed' then
    return true;
  end if;
  if p_gq.status <> 'pending' then
    return false;
  end if;

  select count(*) into v_answers from public.answers where game_question_id = p_gq.id;
  if v_answers < 2 then
    return false;
  end if;

  update public.game_questions
     set status = 'revealed', revealed_at = now()
   where id = p_gq.id;

  perform public._notify_room(p_gq.room_id, 'question_revealed',
    jsonb_build_object('question_index', p_gq.question_index));
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- submit_answer (atomic, idempotent, immutable)
-- Before reveal the response contains ONLY the caller's own status.
-- ---------------------------------------------------------------------
create or replace function public.submit_answer(p_room_id uuid, p_game_question_id uuid, p_selected_player_number integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := public._require_uid();
  v_gq       public.game_questions;
  v_me       public.game_players;
  v_existing public.answers;
  v_revealed boolean;
begin
  if p_selected_player_number is null or p_selected_player_number not in (1, 2) then
    perform public._fail('invalid_choice');
  end if;

  v_gq := public._current_question_for_action(p_room_id, v_uid, p_game_question_id);
  v_me := public._player(p_room_id, v_uid);

  select * into v_existing from public.answers
   where game_question_id = v_gq.id and player_id = v_me.id;

  if v_existing.id is not null then
    -- Idempotent retry of the same choice is fine; changing it is not.
    if v_existing.selected_player_number <> p_selected_player_number then
      perform public._fail('already_submitted');
    end if;
    return jsonb_build_object('ok', true, 'duplicate', true,
                              'revealed', v_gq.status = 'revealed');
  end if;

  if v_gq.status <> 'pending' then
    perform public._fail('question_closed');
  end if;

  insert into public.answers (game_question_id, player_id, selected_player_number)
  values (v_gq.id, v_me.id, p_selected_player_number::smallint);

  update public.game_players set last_seen_at = now() where id = v_me.id;
  update public.game_rooms set expires_at = now() + interval '24 hours' where id = p_room_id;

  v_revealed := public._try_reveal(v_gq);
  if not v_revealed then
    -- safe event: who submitted, never what they chose
    perform public._notify_room(p_room_id, 'answer_submitted',
      jsonb_build_object('question_index', v_gq.question_index, 'player_number', v_me.player_number));
  end if;

  return jsonb_build_object('ok', true, 'duplicate', false, 'revealed', v_revealed);
end;
$$;

-- ---------------------------------------------------------------------
-- reveal_question: idempotent recovery path (submit_answer already
-- reveals). Reveals only when both answers exist.
-- ---------------------------------------------------------------------
create or replace function public.reveal_question(p_room_id uuid, p_game_question_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_uid();
  v_gq  public.game_questions := public._current_question_for_action(p_room_id, v_uid, p_game_question_id);
begin
  return jsonb_build_object('ok', true, 'revealed', public._try_reveal(v_gq));
end;
$$;

-- ---------------------------------------------------------------------
-- skip_question: a question is skipped only when BOTH players vote to skip.
-- Pass p_vote = false to withdraw a vote.
-- ---------------------------------------------------------------------
create or replace function public.skip_question(p_room_id uuid, p_game_question_id uuid, p_vote boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_uid();
  v_gq  public.game_questions;
  v_me  public.game_players;
begin
  if p_vote is null then
    perform public._fail('invalid_input');
  end if;
  v_gq := public._current_question_for_action(p_room_id, v_uid, p_game_question_id);
  v_me := public._player(p_room_id, v_uid);

  if v_gq.status <> 'pending' then
    perform public._fail('question_closed');
  end if;

  if v_me.player_number = 1 then
    update public.game_questions set skip_vote_p1 = p_vote where id = v_gq.id returning * into v_gq;
  else
    update public.game_questions set skip_vote_p2 = p_vote where id = v_gq.id returning * into v_gq;
  end if;

  if v_gq.skip_vote_p1 and v_gq.skip_vote_p2 then
    update public.game_questions set status = 'skipped', revealed_at = now() where id = v_gq.id;
    perform public._notify_room(p_room_id, 'question_skipped',
      jsonb_build_object('question_index', v_gq.question_index));
    return jsonb_build_object('ok', true, 'skipped', true);
  end if;

  perform public._notify_room(p_room_id, 'skip_vote',
    jsonb_build_object('question_index', v_gq.question_index, 'player_number', v_me.player_number, 'vote', p_vote));
  return jsonb_build_object('ok', true, 'skipped', false);
end;
$$;

-- ---------------------------------------------------------------------
-- advance_question: compare-and-set on the question index, so two clients
-- pressing "Next" at the same moment move the game exactly once.
-- ---------------------------------------------------------------------
create or replace function public.advance_question(p_room_id uuid, p_from_index integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := public._require_uid();
  v_room  public.game_rooms := public._member_room(p_room_id, v_uid, 'update');
  v_gq    public.game_questions;
  v_total integer;
begin
  if p_from_index is null then
    perform public._fail('invalid_input');
  end if;

  if v_room.status = 'completed' then
    return jsonb_build_object('ok', true, 'moved', false, 'completed', true);
  end if;
  if v_room.status <> 'in_progress' then
    perform public._fail('game_not_in_progress');
  end if;
  if public._is_expired(v_room) then
    perform public._fail('room_expired');
  end if;

  if v_room.current_question_index <> p_from_index then
    -- someone else already advanced; not an error
    return jsonb_build_object('ok', true, 'moved', false,
                              'question_index', v_room.current_question_index);
  end if;

  select * into v_gq from public.game_questions
   where room_id = p_room_id and question_index = v_room.current_question_index
   for update;

  if v_gq.status = 'pending' then
    perform public._fail('question_not_finished');
  end if;

  select count(*) into v_total from public.game_questions where room_id = p_room_id;

  if v_room.current_question_index + 1 >= v_total then
    perform public._compute_results(p_room_id);
    update public.game_rooms
       set status = 'completed', completed_at = now()
     where id = p_room_id;
    perform public._notify_room(p_room_id, 'game_completed');
    return jsonb_build_object('ok', true, 'moved', true, 'completed', true);
  end if;

  update public.game_rooms
     set current_question_index = current_question_index + 1,
         expires_at = now() + interval '24 hours'
   where id = p_room_id;

  perform public._notify_room(p_room_id, 'question_advanced',
    jsonb_build_object('question_index', v_room.current_question_index + 1));
  return jsonb_build_object('ok', true, 'moved', true, 'completed', false,
                            'question_index', v_room.current_question_index + 1);
end;
$$;

-- ---------------------------------------------------------------------
-- get_game_state: the single authorised read model for a live room.
-- Partner's choice is included ONLY when the question is revealed.
-- ---------------------------------------------------------------------
create or replace function public.get_game_state(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := public._require_uid();
  v_room     public.game_rooms := public._member_room(p_room_id, v_uid);
  v_me       public.game_players;
  v_gq       public.game_questions;
  v_q        public.questions;
  v_my_ans   smallint;
  v_partner_submitted boolean;
  v_current  jsonb := null;
  v_answers  jsonb := null;
  v_results  jsonb := null;
  v_total    integer;
  v_status   text;
begin
  update public.game_players set last_seen_at = now()
   where room_id = p_room_id and user_id = v_uid
  returning * into v_me;

  v_status := case when public._is_expired(v_room) then 'expired' else v_room.status end;

  select count(*) into v_total from public.game_questions where room_id = p_room_id;

  if v_room.status = 'in_progress' then
    select * into v_gq from public.game_questions
     where room_id = p_room_id and question_index = v_room.current_question_index;
    select * into v_q from public.questions where id = v_gq.question_id;

    select a.selected_player_number into v_my_ans
      from public.answers a
     where a.game_question_id = v_gq.id and a.player_id = v_me.id;

    select exists (
      select 1 from public.answers a
       where a.game_question_id = v_gq.id and a.player_id <> v_me.id
    ) into v_partner_submitted;

    if v_gq.status = 'revealed' then
      select jsonb_object_agg('p' || gp.player_number, a.selected_player_number)
        into v_answers
        from public.answers a
        join public.game_players gp on gp.id = a.player_id
       where a.game_question_id = v_gq.id;
    end if;

    v_current := jsonb_build_object(
      'id', v_gq.id,
      'index', v_gq.question_index,
      'category', v_q.category,
      'question_text', v_q.question_text,
      'status', v_gq.status,
      'my_answer', v_my_ans,
      'partner_submitted', v_partner_submitted,
      'my_skip_vote', case when v_me.player_number = 1 then v_gq.skip_vote_p1 else v_gq.skip_vote_p2 end,
      'partner_skip_vote', case when v_me.player_number = 1 then v_gq.skip_vote_p2 else v_gq.skip_vote_p1 end,
      'discussion_prompt', case when v_gq.status <> 'pending' then v_q.discussion_prompt end,
      'answers', v_answers
    );
  end if;

  if v_room.status = 'completed' then
    select to_jsonb(r) - 'id' - 'room_id' into v_results from public.game_results r where r.room_id = p_room_id;
  end if;

  return jsonb_build_object(
    'room', jsonb_build_object(
      'id', v_room.id,
      'invite_code', v_room.invite_code,
      'couple_name', v_room.couple_name,
      'status', v_status,
      'current_question_index', v_room.current_question_index,
      'settings', v_room.settings,
      'created_at', v_room.created_at,
      'started_at', v_room.started_at,
      'expires_at', v_room.expires_at,
      'completed_at', v_room.completed_at,
      'next_room_id', v_room.next_room_id,
      'question_count', v_total
    ),
    'me', jsonb_build_object(
      'player_number', v_me.player_number,
      'display_name', v_me.display_name,
      'is_ready', v_me.is_ready,
      'is_host', v_room.host_user_id = v_uid
    ),
    'players', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'player_number', gp.player_number,
               'display_name', gp.display_name,
               'is_ready', gp.is_ready,
               'is_host', gp.user_id = v_room.host_user_id,
               'last_seen_at', gp.last_seen_at
             ) order by gp.player_number), '[]'::jsonb)
      from public.game_players gp where gp.room_id = p_room_id
    ),
    'current', v_current,
    'results', v_results,
    'server_time', now()
  );
end;
$$;

-- ---------------------------------------------------------------------
-- get_completed_results: full revealed history of one finished session.
-- ---------------------------------------------------------------------
create or replace function public.get_completed_results(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public._require_uid();
  v_room public.game_rooms := public._member_room(p_room_id, v_uid);
begin
  if v_room.status <> 'completed' then
    perform public._fail('game_not_completed');
  end if;

  return jsonb_build_object(
    'room', jsonb_build_object(
      'id', v_room.id,
      'couple_name', v_room.couple_name,
      'settings', v_room.settings,
      'started_at', v_room.started_at,
      'completed_at', v_room.completed_at,
      'next_room_id', v_room.next_room_id
    ),
    'players', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'player_number', gp.player_number,
               'display_name', gp.display_name,
               'is_me', gp.user_id = v_uid
             ) order by gp.player_number), '[]'::jsonb)
      from public.game_players gp where gp.room_id = p_room_id
    ),
    'results', (select to_jsonb(r) - 'id' - 'room_id' from public.game_results r where r.room_id = p_room_id),
    'questions', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'index', gq.question_index,
               'category', q.category,
               'question_text', q.question_text,
               'discussion_prompt', q.discussion_prompt,
               'status', gq.status,
               'answers', case when gq.status = 'revealed' then (
                  select jsonb_object_agg('p' || gp.player_number, a.selected_player_number)
                    from public.answers a
                    join public.game_players gp on gp.id = a.player_id
                   where a.game_question_id = gq.id
               ) end
             ) order by gq.question_index), '[]'::jsonb)
      from public.game_questions gq
      join public.questions q on q.id = gq.question_id
      where gq.room_id = p_room_id
    )
  );
end;
$$;

-- ---------------------------------------------------------------------
-- get_history: the caller's completed sessions (365-day retention)
-- ---------------------------------------------------------------------
create or replace function public.get_history(p_limit integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public._require_uid();
  v_limit integer := least(greatest(coalesce(p_limit, 30), 1), 100);
begin
  return (
    select coalesce(jsonb_agg(item order by (item ->> 'completed_at') desc), '[]'::jsonb)
    from (
      select jsonb_build_object(
               'room_id', gr.id,
               'couple_name', gr.couple_name,
               'completed_at', gr.completed_at,
               'mode', gr.settings ->> 'mode',
               'question_count', (select count(*) from public.game_questions gq where gq.room_id = gr.id),
               'results', (select to_jsonb(r) - 'id' - 'room_id' from public.game_results r where r.room_id = gr.id),
               'players', (
                  select jsonb_agg(jsonb_build_object('player_number', p.player_number, 'display_name', p.display_name)
                                   order by p.player_number)
                  from public.game_players p where p.room_id = gr.id
               )
             ) as item
      from public.game_rooms gr
      where gr.status = 'completed'
        and gr.completed_at > now() - interval '365 days'
        and exists (select 1 from public.game_players me where me.room_id = gr.id and me.user_id = v_uid)
      order by gr.completed_at desc
      limit v_limit
    ) s
  );
end;
$$;

-- ---------------------------------------------------------------------
-- delete_game_session: either seated player may permanently delete a
-- session; answers, questions, players and results cascade.
-- ---------------------------------------------------------------------
create or replace function public.delete_game_session(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public._require_uid();
  v_room public.game_rooms := public._member_room(p_room_id, v_uid, 'update');
begin
  perform public._notify_room(p_room_id, 'room_deleted');
  delete from public.game_rooms where id = v_room.id;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- cancel_room: host abandons a room that has not started.
-- ---------------------------------------------------------------------
create or replace function public.cancel_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public._require_uid();
  v_room public.game_rooms := public._member_room(p_room_id, v_uid, 'update');
begin
  if v_room.host_user_id <> v_uid then
    perform public._fail('host_only');
  end if;
  if v_room.status not in ('waiting', 'in_progress') then
    perform public._fail('room_not_active');
  end if;
  update public.game_rooms set status = 'cancelled' where id = p_room_id;
  perform public._notify_room(p_room_id, 'room_cancelled');
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- play_again: new session, same two seats, fresh questions. Idempotent -
-- both partners pressing it end up in the same new room.
-- ---------------------------------------------------------------------
create or replace function public.play_again(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := public._require_uid();
  v_room    public.game_rooms := public._member_room(p_room_id, v_uid, 'update');
  v_new_id  uuid;
  v_code    text;
  v_count   integer;
  v_rounds  text[];
  v_attempt integer := 0;
begin
  if v_room.status <> 'completed' then
    perform public._fail('game_not_completed');
  end if;

  if v_room.next_room_id is not null
     and exists (select 1 from public.game_rooms where id = v_room.next_room_id) then
    return jsonb_build_object('room_id', v_room.next_room_id, 'created', false);
  end if;

  if public._rate_limited(v_uid, 'create_room', interval '1 hour', 20) then
    perform public._fail('rate_limited');
  end if;

  select array_agg(value) into v_rounds from jsonb_array_elements_text(v_room.settings -> 'rounds');

  loop
    v_attempt := v_attempt + 1;
    v_code := public._generate_invite_code();
    begin
      insert into public.game_rooms (invite_code, host_user_id, couple_name, settings, previous_room_id)
      values (v_code, v_uid, v_room.couple_name, v_room.settings - 'question_count', v_room.id)
      returning id into v_new_id;
      exit;
    exception when unique_violation then
      if v_attempt >= 5 then
        perform public._fail('try_again');
      end if;
    end;
  end loop;

  insert into public.game_players (room_id, user_id, display_name, player_number, is_ready)
  select v_new_id, gp.user_id, gp.display_name, gp.player_number, false
    from public.game_players gp where gp.room_id = v_room.id;

  v_count := public._seed_room_questions(v_new_id, v_rounds, (v_room.settings ->> 'per_round')::integer);
  if v_count = 0 then
    perform public._fail('no_questions');
  end if;
  update public.game_rooms
     set settings = settings || jsonb_build_object('question_count', v_count)
   where id = v_new_id;

  update public.game_rooms set next_room_id = v_new_id where id = v_room.id;
  insert into public.rate_limit_events (user_id, action) values (v_uid, 'create_room');

  perform public._notify_room(v_room.id, 'play_again', jsonb_build_object('next_room_id', v_new_id));
  return jsonb_build_object('room_id', v_new_id, 'created', true);
end;
$$;

-- =====================================================================
-- Privileges: helpers are private; only the RPCs below are callable,
-- and only by signed-in (incl. anonymous) users.
-- =====================================================================
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
  public.play_again(uuid)
to authenticated;
