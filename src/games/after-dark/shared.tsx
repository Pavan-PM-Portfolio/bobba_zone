import { useCallback, useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { api } from '../../lib/api';
import { toAppError } from '../../lib/errors';
import { useToast } from '../../components/ui/Toast';
import { entriesFor } from '../../hooks/useSession';
import { seededRandom } from '../../lib/random';
import type { SessionView } from '../../lib/types';
import type { SessionApi } from '../types';
import type { Terms } from './content/taxonomy';

/** Fetches the agreed terms whenever the session changes. */
export function useTerms(view: SessionView) {
  const [terms, setTerms] = useState<Terms | null>(null);
  const reload = useCallback(async () => {
    try {
      setTerms(await api.afterDarkTerms(view.session.id));
    } catch {
      /* keep last known terms */
    }
  }, [view.session.id]);
  useEffect(() => {
    void reload();
  }, [reload, view.server_time]);
  return { terms, reload };
}

/** Deterministic pick so both devices draw the same card. */
export function drawFrom<T extends { id: string }>(pool: T[], seed: string, exclude: string[] = []): T | null {
  const fresh = pool.filter((p) => !exclude.includes(p.id));
  const from = fresh.length ? fresh : pool;
  if (!from.length) return null;
  return from[Math.floor(seededRandom(seed)() * from.length)]!;
}

/** Favourite a prompt: saved as a private memory for the two of you. */
export function FavouriteButton({ view, s, id, text }: { view: SessionView; s: SessionApi; id: string; text: string }) {
  const toast = useToast();
  const me = view.me.player_number;
  const fav = entriesFor<{ momentId: string }>(view, `pub:fav:${id}`)[me];
  const [busy, setBusy] = useState(false);
  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (fav) {
        await api.deleteMoment(fav.payload.momentId).catch(() => {});
        await s.remove(`pub:fav:${id}`);
      } else {
        const r = await api.saveMoment({ game: 'after_dark', title: text.slice(0, 120), body: 'Favourite After Dark prompt', sessionId: view.session.id });
        await s.submit(`pub:fav:${id}`, { momentId: r.id });
      }
    } catch (e) {
      toast(toAppError(e).message, 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={Boolean(fav)}
      aria-label={fav ? 'Remove from favourites' : 'Save to favourites'}
      className="grid size-9 place-items-center rounded-[6px] text-ink-mute hover:bg-mist hover:text-accent"
    >
      <Star className={`size-4.5 ${fav ? 'fill-accent text-accent' : ''}`} />
    </button>
  );
}

/** Card used to present a prompt with a short, purposeful entrance. */
export function PromptCard({ kicker, children, aside, tone = 'white', animateKey }: { kicker: React.ReactNode; children: React.ReactNode; aside?: React.ReactNode; tone?: 'white' | 'blush'; animateKey?: string }) {
  return (
    <div key={animateKey} className={`animate-flip rounded-[12px] p-6 shadow-lift sm:p-7 ${tone === 'blush' ? 'bg-shell' : 'bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-accent">{kicker}</p>
        {aside}
      </div>
      <div className="mt-2 text-[1.35rem] leading-snug font-semibold tracking-[-0.015em] text-balance sm:text-[1.55rem]">{children}</div>
    </div>
  );
}

/**
 * Keeps prompt order stable when boundaries change mid-game: positions that
 * were already played keep their prompt (read from answer payloads), and only
 * unplayed positions are filled from the current eligible list.
 */
export function stablePool<T extends { id: string }>(eligible: T[], byId: Record<string, T>, playedIds: (string | undefined)[], length: number): T[] {
  const out: T[] = [];
  const used = new Set(playedIds.filter(Boolean) as string[]);
  const rest = eligible.filter((p) => !used.has(p.id));
  for (let i = 0; i < length; i++) {
    const id = playedIds[i];
    const fixed = id ? byId[id] : undefined;
    if (fixed) out.push(fixed);
    else {
      const next = rest.shift();
      if (!next) break;
      out.push(next);
    }
  }
  return out;
}

/** The prompt id recorded in my answer at each index (my own entries are always visible to me). */
export function playedIds(view: SessionView, keyFor: (i: number) => string, upTo: number): (string | undefined)[] {
  const out: (string | undefined)[] = [];
  for (let i = 0; i < upTo; i++) {
    const pair = entriesFor<{ id?: string }>(view, keyFor(i));
    out.push(pair[view.me.player_number]?.payload.id ?? pair[1]?.payload.id ?? pair[2]?.payload.id);
  }
  return out;
}
