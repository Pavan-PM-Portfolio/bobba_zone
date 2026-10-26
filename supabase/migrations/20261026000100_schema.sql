-- =====================================================================
-- Who Is More Likely To? - Couples Edition
-- Migration 1: schema, constraints, indexes, Row Level Security
--
-- Security model (summary):
--   * Every table has RLS enabled.
--   * Clients get NO direct table privileges except SELECT on the active
--     question bank. All game reads/writes go through SECURITY DEFINER RPCs
--     (migration 2) that check auth.uid() and room membership.
--   * The answers table is never readable by clients. Answers leave the
--     database only through get_game_state / get_completed_results, and
--     only after the question is revealed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(btrim(display_name)) between 1 and 30),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- questions (editable bank - change rows, not frontend code)
-- ---------------------------------------------------------------------
create table if not exists public.questions (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,               -- stable human identifier, e.g. 'romance-01'
  category          text not null check (category in ('romance', 'chaotic', 'understanding', 'future')),
  question_text     text not null check (char_length(question_text) between 5 and 200),
  discussion_prompt text check (discussion_prompt is null or char_length(discussion_prompt) <= 300),
  is_active         boolean not null default true,
  display_order     integer not null default 0,
  created_at        timestamptz not null default now()
);
create index if not exists questions_category_active_idx on public.questions (category, is_active, display_order);

-- ---------------------------------------------------------------------
-- game_rooms
-- ---------------------------------------------------------------------
create table if not exists public.game_rooms (
  id                     uuid primary key default gen_random_uuid(),
  invite_code            text not null unique check (invite_code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  host_user_id           uuid not null references auth.users (id) on delete cascade,
  couple_name            text check (couple_name is null or char_length(couple_name) <= 40),
  status                 text not null default 'waiting'
                           check (status in ('waiting', 'in_progress', 'completed', 'cancelled')),
  current_question_index integer not null default 0 check (current_question_index >= 0),
  settings               jsonb not null default '{}'::jsonb,
  previous_room_id       uuid references public.game_rooms (id) on delete set null,
  next_room_id           uuid references public.game_rooms (id) on delete set null,
  created_at             timestamptz not null default now(),
  started_at             timestamptz,
  expires_at             timestamptz not null default (now() + interval '24 hours'),
  completed_at           timestamptz
);
create index if not exists game_rooms_status_expires_idx on public.game_rooms (status, expires_at);
create index if not exists game_rooms_host_idx on public.game_rooms (host_user_id);

-- ---------------------------------------------------------------------
-- game_players (max two seats per room)
-- ---------------------------------------------------------------------
create table if not exists public.game_players (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references public.game_rooms (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  display_name   text not null check (char_length(btrim(display_name)) between 1 and 30),
  player_number  smallint not null check (player_number in (1, 2)),
  is_ready       boolean not null default false,
  joined_at      timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  constraint game_players_one_seat_per_user unique (room_id, user_id),
  constraint game_players_unique_seat unique (room_id, player_number)
);
create index if not exists game_players_user_idx on public.game_players (user_id);

-- ---------------------------------------------------------------------
-- game_questions (the ordered question list for one session)
-- ---------------------------------------------------------------------
create table if not exists public.game_questions (
  id              uuid primary key default gen_random_uuid(),
  room_id         uuid not null references public.game_rooms (id) on delete cascade,
  question_id     uuid not null references public.questions (id) on delete restrict,
  question_index  integer not null check (question_index >= 0),
  status          text not null default 'pending' check (status in ('pending', 'revealed', 'skipped')),
  skip_vote_p1    boolean not null default false,
  skip_vote_p2    boolean not null default false,
  created_at      timestamptz not null default now(),
  revealed_at     timestamptz,
  constraint game_questions_unique_index unique (room_id, question_index),
  constraint game_questions_no_duplicates unique (room_id, question_id)
);

-- ---------------------------------------------------------------------
-- answers (never directly readable or writable by clients)
-- ---------------------------------------------------------------------
create table if not exists public.answers (
  id                     uuid primary key default gen_random_uuid(),
  game_question_id       uuid not null references public.game_questions (id) on delete cascade,
  player_id              uuid not null references public.game_players (id) on delete cascade,
  selected_player_number smallint not null check (selected_player_number in (1, 2)),
  submitted_at           timestamptz not null default now(),
  constraint answers_one_per_player unique (game_question_id, player_id)
);
create index if not exists answers_player_idx on public.answers (player_id);

-- Answers are immutable once written, even for privileged callers.
create or replace function public.prevent_answer_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'answers are immutable' using errcode = 'P0001';
end;
$$;

drop trigger if exists answers_immutable on public.answers;
create trigger answers_immutable
  before update on public.answers
  for each row execute function public.prevent_answer_update();

-- ---------------------------------------------------------------------
-- game_results (derived; recomputable from answers + game_questions)
-- ---------------------------------------------------------------------
create table if not exists public.game_results (
  id                   uuid primary key default gen_random_uuid(),
  room_id              uuid not null unique references public.game_rooms (id) on delete cascade,
  questions_answered   integer not null check (questions_answered >= 0),
  questions_skipped    integer not null default 0 check (questions_skipped >= 0),
  matching_answers     integer not null check (matching_answers >= 0 and matching_answers <= questions_answered),
  agreement_percentage numeric(5, 2) not null check (agreement_percentage between 0 and 100),
  round_breakdown      jsonb not null default '[]'::jsonb,
  completed_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- rate limiting ledger (invite-code guessing, room spam)
-- ---------------------------------------------------------------------
create table if not exists public.rate_limit_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  action      text not null check (action in ('join_failed', 'create_room')),
  created_at  timestamptz not null default now()
);
create index if not exists rate_limit_events_lookup_idx on public.rate_limit_events (user_id, action, created_at);

-- ---------------------------------------------------------------------
-- Row Level Security: on for every table
-- ---------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.questions         enable row level security;
alter table public.game_rooms        enable row level security;
alter table public.game_players      enable row level security;
alter table public.game_questions    enable row level security;
alter table public.answers           enable row level security;
alter table public.game_results      enable row level security;
alter table public.rate_limit_events enable row level security;

-- Supabase grants broad default privileges to anon/authenticated on new
-- tables. Remove them: clients talk to the game only through RPCs.
revoke all on public.profiles, public.questions, public.game_rooms, public.game_players,
              public.game_questions, public.answers, public.game_results, public.rate_limit_events
  from anon, authenticated;

-- The only direct read clients get: the active question bank (it is not private).
grant select on public.questions to authenticated;

drop policy if exists "Authenticated users can read active questions" on public.questions;
create policy "Authenticated users can read active questions"
  on public.questions for select
  to authenticated
  using (is_active);

-- Profiles: a user can read their own profile row. (Writes go through RPCs.)
grant select on public.profiles to authenticated;
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

-- No policies on game_rooms, game_players, game_questions, answers,
-- game_results or rate_limit_events: with RLS on and no privileges,
-- every direct client query is denied.
