-- =====================================================================
-- Migration 3: Realtime authorization for private room channels
--
-- Channel topic: "room:<room_uuid>", joined with { config: { private: true } }.
--   * Only players seated in that room can subscribe (receive broadcasts
--     and presence).
--   * Clients may publish PRESENCE only. Game broadcasts are sent by the
--     database via realtime.send() inside the RPCs, and they never contain
--     answer contents - only "something changed" signals.
-- =====================================================================

create or replace function public.is_room_channel_member(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_room uuid;
begin
  if p_topic is null
     or p_topic !~ '^room:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  v_room := substr(p_topic, 6)::uuid;
  return exists (
    select 1 from public.game_players gp
     where gp.room_id = v_room and gp.user_id = auth.uid()
  );
end;
$$;

revoke all on function public.is_room_channel_member(text) from public, anon;
grant execute on function public.is_room_channel_member(text) to authenticated;

drop policy if exists "Room members can receive room events" on realtime.messages;
create policy "Room members can receive room events"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and public.is_room_channel_member((select realtime.topic()))
  );

drop policy if exists "Room members can publish presence" on realtime.messages;
create policy "Room members can publish presence"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'presence'
    and public.is_room_channel_member((select realtime.topic()))
  );
