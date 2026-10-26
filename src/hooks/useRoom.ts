import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { api } from '../lib/api';
import { toAppError, type AppError } from '../lib/errors';
import { requireSupabase } from '../lib/supabase';
import type { GameState, PlayerNumber } from '../lib/types';

export type Connection = 'connecting' | 'live' | 'reconnecting' | 'offline';

export interface RoomEvent {
  event: string;
  payload: Record<string, unknown>;
}

/**
 * Server-authoritative room state.
 *
 * - The database is the source of truth; this hook only mirrors it.
 * - Realtime broadcasts on the private channel "room:<id>" are *signals*
 *   ("something changed"). They never carry answers; on each signal we
 *   refetch get_game_state(), which enforces the privacy rules.
 * - Presence on the same channel shows whether the partner is connected.
 * - If Realtime drops, we fall back to polling and refetch on reconnect,
 *   tab focus and network recovery.
 */
export function useRoom(roomId: string | undefined, onEvent?: (e: RoomEvent) => void) {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<Connection>('connecting');
  const [onlinePlayers, setOnlinePlayers] = useState<Set<PlayerNumber>>(new Set());

  const inflight = useRef<Promise<void> | null>(null);
  const queued = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const myNumber = useRef<PlayerNumber | null>(null);

  const refresh = useCallback(async () => {
    if (!roomId) return;
    // coalesce bursts of events into at most one extra fetch
    if (inflight.current) {
      queued.current = true;
      return inflight.current;
    }
    const run = (async () => {
      try {
        const s = await api.getState(roomId);
        myNumber.current = s.me.player_number;
        setState(s);
        setError(null);
        setConnection((c) =>
          c === 'offline' ? (channelRef.current?.state === 'joined' ? 'live' : 'reconnecting') : c,
        );
      } catch (e) {
        const err = toAppError(e);
        if (err.code === 'network') setConnection('offline');
        else setError(err);
      } finally {
        setLoading(false);
      }
    })();
    inflight.current = run;
    await run;
    inflight.current = null;
    if (queued.current) {
      queued.current = false;
      await refresh();
    }
  }, [roomId]);

  // Realtime subscription
  useEffect(() => {
    if (!roomId) return;
    const sb = requireSupabase();
    let disposed = false;

    (async () => {
      await refresh();
      const { data } = await sb.auth.getSession();
      if (data.session) sb.realtime.setAuth(data.session.access_token);
      if (disposed) return;

      const channel = sb.channel(`room:${roomId}`, {
        config: { private: true, broadcast: { self: true }, presence: { key: crypto.randomUUID() } },
      });
      channelRef.current = channel;

      channel
        .on('broadcast', { event: '*' }, (msg) => {
          onEventRef.current?.({ event: msg.event, payload: (msg.payload ?? {}) as Record<string, unknown> });
          void refresh();
        })
        .on('presence', { event: 'sync' }, () => {
          const present = new Set<PlayerNumber>();
          for (const metas of Object.values(channel.presenceState<{ player_number?: PlayerNumber }>())) {
            for (const m of metas) if (m.player_number) present.add(m.player_number);
          }
          setOnlinePlayers(present);
        })
        .subscribe(async (status) => {
          if (disposed) return;
          if (status === 'SUBSCRIBED') {
            setConnection('live');
            await refresh(); // catch anything missed while (re)connecting
            if (myNumber.current) await channel.track({ player_number: myNumber.current });
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnection('reconnecting');
          } else if (status === 'CLOSED') {
            setConnection('reconnecting');
          }
        });
    })();

    return () => {
      disposed = true;
      if (channelRef.current) {
        void sb.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [roomId, refresh]);

  // Re-track presence once we learn our seat
  useEffect(() => {
    const ch = channelRef.current;
    if (ch && state?.me.player_number && connection === 'live') {
      void ch.track({ player_number: state.me.player_number });
    }
  }, [state?.me.player_number, connection]);

  // Polling fallback: fast while degraded or waiting on the partner, slow otherwise.
  const waitingOnPartner =
    state?.room.status === 'waiting' ||
    (state?.current?.status === 'pending' && (state.current.my_answer !== null || state.current.my_skip_vote));
  useEffect(() => {
    if (!roomId) return;
    const status = state?.room.status;
    if (status === 'completed' || status === 'cancelled' || status === 'expired') return;
    const ms = connection !== 'live' ? 3000 : waitingOnPartner ? 6000 : 15000;
    const t = setInterval(() => void refresh(), ms);
    return () => clearInterval(t);
  }, [roomId, connection, waitingOnPartner, state?.room.status, refresh]);

  // Recover on focus / network return
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && void refresh();
    const onOnline = () => {
      setConnection((c) => (c === 'offline' ? 'reconnecting' : c));
      void refresh();
    };
    const onOffline = () => setConnection('offline');
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refresh]);

  return { state, error, loading, connection, onlinePlayers, refresh };
}
