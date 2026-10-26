-- =====================================================================
-- Migration 8: optional explanations after a reveal (Who Is More Likely To?)
-- A player can explain their pick only once the question is revealed,
-- so explanations can never leak an answer early.
-- =====================================================================

create table if not exists public.room_notes (
  id               uuid primary key default gen_random_uuid(),
  room_id          uuid not null references public.game_rooms (id) on delete cascade,
  game_question_id uuid not null references public.game_questions (id) on delete cascade,
  player_id        uuid not null references public.game_players (id) on delete cascade,
  text             text not null check (char_length(btrim(text)) between 1 and 300),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint room_notes_one_per_player unique (game_question_id, player_id)
);

alter table public.room_notes enable row level security;
revoke all on public.room_notes from anon, authenticated;

create or replace function public.add_room_note(p_room_id uuid, p_game_question_id uuid, p_text text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public._require_uid();
  v_room public.game_rooms := public._member_room(p_room_id, v_uid);
  v_me   public.game_players := public._player(p_room_id, v_uid);
  v_gq   public.game_questions;
  v_text text := btrim(coalesce(p_text, ''));
begin
  if char_length(v_text) not between 1 and 300 then
    perform public._fail('invalid_input');
  end if;
  select * into v_gq from public.game_questions where id = p_game_question_id and room_id = v_room.id;
  if v_gq.id is null then
    perform public._fail('question_not_found');
  end if;
  if v_gq.status <> 'revealed' then
    perform public._fail('question_not_revealed');
  end if;
  insert into public.room_notes (room_id, game_question_id, player_id, text)
  values (v_room.id, v_gq.id, v_me.id, v_text)
  on conflict (game_question_id, player_id) do update set text = excluded.text, updated_at = now();
  perform public._notify_room(v_room.id, 'note_added', jsonb_build_object('question_index', v_gq.question_index));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.get_room_notes(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public._require_uid();
  v_room public.game_rooms := public._member_room(p_room_id, v_uid);
begin
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'question_index', gq.question_index,
             'player_number', gp.player_number,
             'text', n.text
           ) order by gq.question_index, gp.player_number), '[]'::jsonb)
      from public.room_notes n
      join public.game_questions gq on gq.id = n.game_question_id
      join public.game_players gp on gp.id = n.player_id
     where n.room_id = v_room.id and gq.status = 'revealed'
  );
end;
$$;

revoke all on function public.add_room_note(uuid, uuid, text), public.get_room_notes(uuid) from public, anon;
grant execute on function public.add_room_note(uuid, uuid, text), public.get_room_notes(uuid) to authenticated;
