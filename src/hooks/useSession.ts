import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { api } from '../lib/api';
import { toAppError, type AppError } from '../lib/errors';
import { requireSupabase } from '../lib/supabase';
import type { Entry, PlayerNumber, SessionView } from '../lib/types';
import type { Connection } from './useRoom';

/**
 * Server-authoritative session state for games 2-10.
 *
 * Realtime broadcasts on the private channel "session:<id>" are signals
 * only; every change is re-read through get_session(), which applies the
 * reveal rules. Polling covers dropped connections.
 */
export function useSession(sessionId: string | undefined, onEvent?: (event: string) => void) {
  const [view, setView] = useState<SessionView | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [connection, setConnection] = useState<Connection>('connecting');
  const [online, setOnline] = useState<Set<PlayerNumber>>(new Set());
  const inflight = useRef<Promise<void> | null>(null);
  const queued = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const viewRef = useRef<SessionView | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const refresh = useCallback(async (): Promise<void> => {
    if (!sessionId) return;
    if (inflight.current) {
      queued.current = true;
      return inflight.current;
    }
    const run = (async () => {
      try {
        const v = await api.getSession(sessionId);
        viewRef.current = v;
        setView(v);
        setError(null);
        setConnection((c) => (c === 'offline' ? (channelRef.current?.state === 'joined' ? 'live' : 'reconnecting') : c));
      } catch (e) {
        const err = toAppError(e);
        if (err.code === 'network') setConnection('offline');
        else setError(err);
      }
    })();
    inflight.current = run;
    await run;
    inflight.current = null;
    if (queued.current) {
      queued.current = false;
      await refresh();
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const sb = requireSupabase();
    let disposed = false;
    (async () => {
      await refresh();
      const { data } = await sb.auth.getSession();
      if (data.session) sb.realtime.setAuth(data.session.access_token);
      if (disposed) return;
      const channel = sb.channel(`session:${sessionId}`, {
        config: { private: true, presence: { key: crypto.randomUUID() } },
      });
      channelRef.current = channel;
      channel
        .on('broadcast', { event: '*' }, (msg) => {
          onEventRef.current?.(msg.event);
          void refresh();
        })
        .on('presence', { event: 'sync' }, () => {
          const present = new Set<PlayerNumber>();
          for (const metas of Object.values(channel.presenceState<{ seat?: PlayerNumber }>())) {
            for (const m of metas) if (m.seat) present.add(m.seat);
          }
          setOnline(present);
        })
        .subscribe(async (status) => {
          if (disposed) return;
          if (status === 'SUBSCRIBED') {
            setConnection('live');
            await refresh();
            const seat = viewRef.current?.me.player_number;
            if (seat) await channel.track({ seat });
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setConnection('reconnecting');
          }
        });
    })();
    return () => {
      disposed = true;
      if (channelRef.current) void sb.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [sessionId, refresh]);

  useEffect(() => {
    const seat = view?.me.player_number;
    if (seat && connection === 'live') void channelRef.current?.track({ seat });
  }, [view?.me.player_number, connection]);

  const status = view?.session.status;
  useEffect(() => {
    if (!sessionId || status === 'completed' || status === 'cancelled' || status === 'expired') return;
    const ms = connection !== 'live' ? 3000 : view?.partner_pending.length === 0 ? 8000 : 15000;
    const t = setInterval(() => void refresh(), ms);
    return () => clearInterval(t);
  }, [sessionId, connection, status, view?.partner_pending.length, refresh]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && void refresh();
    const onOnline = () => void refresh();
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

  const actions = useMemo(
    () => ({
      submit: async (key: string, payload: Record<string, unknown>) => {
        await api.submitEntry(sessionId!, key, payload);
        await refresh();
      },
      remove: async (key: string) => {
        await api.deleteEntry(sessionId!, key);
        await refresh();
      },
      /**
       * Apply a state change computed from the latest state. On a version
       * conflict (the partner changed it first) we re-read and recompute,
       * so both players pressing "Next" moves the game exactly once.
       */
      patch: async (make: (state: Record<string, unknown>) => Record<string, unknown> | null) => {
        for (let attempt = 0; attempt < 4; attempt++) {
          const v = viewRef.current;
          if (!v) return false;
          const p = make(v.session.state);
          if (!p) return false;
          const res = await api.updateState(sessionId!, p, v.session.state_version);
          await refresh();
          if (res.ok) return true;
        }
        return false;
      },
      complete: async (title?: string) => {
        await api.completeSession(sessionId!, title);
        await refresh();
      },
    }),
    [sessionId, refresh],
  );

  return { view, error, connection, online, refresh, ...actions };
}

/** Convenience selectors over a SessionView. */
export function entriesFor<P = Record<string, unknown>>(view: SessionView, key: string): Partial<Record<PlayerNumber, Entry<P>>> {
  const out: Partial<Record<PlayerNumber, Entry<P>>> = {};
  for (const e of view.entries) if (e.key === key) out[e.player_number] = e as Entry<P>;
  return out;
}

export function entriesWithPrefix<P = Record<string, unknown>>(view: SessionView, prefix: string): Entry<P>[] {
  return view.entries.filter((e) => e.key.startsWith(prefix)) as Entry<P>[];
}

export function partnerHasPending(view: SessionView, key: string) {
  return view.partner_pending.includes(key);
}

export function seatNames(view: SessionView): Record<PlayerNumber, string> {
  return {
    1: view.players.find((p) => p.player_number === 1)?.display_name ?? 'Player 1',
    2: view.players.find((p) => p.player_number === 2)?.display_name ?? 'Player 2',
  };
}
