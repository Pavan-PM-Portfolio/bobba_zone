-- =====================================================================
-- Migration 5: players must use real (admin-created) accounts.
-- Anonymous Supabase sessions are refused by every game RPC, so the game
-- stays private even if anonymous sign-ins are re-enabled by mistake.
-- =====================================================================

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
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    perform public._fail('account_required');
  end if;
  return v_uid;
end;
$$;

revoke all on function public._require_uid() from public, anon, authenticated;

-- Realtime channel membership also requires a non-anonymous session.
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
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    return false;
  end if;
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
