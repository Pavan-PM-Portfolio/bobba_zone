import { TURN_ONS, LEAD } from './attraction';
import { TOUCH, SENSORY } from './physical';
import { KINKS } from './kink';
import { FANTASIES } from './fantasy';
import { TWO, SECRETS, MATCH } from './personal';
import { OPEN, type DesireCat, type DesireQ } from './types';

export * from './types';

export const DESIRE_QS: DesireQ[] = [...TURN_ONS, ...LEAD, ...TOUCH, ...SENSORY, ...KINKS, ...FANTASIES, ...TWO, ...SECRETS, ...MATCH];

const BY_ID = new Map(DESIRE_QS.map((q) => [q.id, q]));
export const desireById = (id: string) => BY_ID.get(id);

/** Questions in the given categories that both players opted into. */
export function desirePool(agreed: string[] | undefined, cats: DesireCat[]): DesireQ[] {
  if (!agreed?.length) return [];
  return DESIRE_QS.filter((q) => cats.includes(q.cat) && agreed.includes(q.cat));
}

export type PairVerdict = 'same' | 'overlap' | 'different' | 'both-open' | 'one-open' | 'neither-open' | 'pass';

/** Neutral comparison of two revealed answers. Never ranks, never infers. */
export function pairVerdict(q: DesireQ, a: string[], b: string[]): PairVerdict {
  if (q.kind === 'scale') {
    if (a.includes('pass') || b.includes('pass')) return 'pass';
    const oa = OPEN.includes(a[0] ?? '');
    const ob = OPEN.includes(b[0] ?? '');
    return oa && ob ? 'both-open' : oa || ob ? 'one-open' : 'neither-open';
  }
  const shared = a.filter((x) => b.includes(x));
  if (shared.length === a.length && a.length === b.length) return 'same';
  return shared.length ? 'overlap' : 'different';
}

export function verdictText(v: PairVerdict, predictive: boolean): string {
  if (predictive) return v === 'same' ? 'Spot on. The prediction matched.' : 'Not this time. Now you know a little more.';
  switch (v) {
    case 'same':
      return 'You share this preference.';
    case 'overlap':
      return 'Some shared ground, and some differences.';
    case 'different':
      return 'You approached this differently.';
    case 'both-open':
      return 'You are both open to talking about this. You may want to discuss this one. Interest is not agreement; decide together, any time.';
    case 'one-open':
      return 'You approached this differently. That is useful to know, and nothing more.';
    case 'neither-open':
      return 'Neither of you is drawn to this. Good to know.';
    case 'pass':
      return 'One of you preferred not to answer, and that is completely fine.';
  }
}

/** Toggle an option, enforcing single choice or "up to 2". */
export function toggleDesire(q: DesireQ, picks: string[], id: string): string[] {
  if (!q.options.some((o) => o.id === id)) return picks;
  if (picks.includes(id)) return picks.filter((p) => p !== id);
  if (q.maxPicks === 1) return [id];
  return picks.length >= q.maxPicks ? picks : [...picks, id];
}

export function validDesire(q: DesireQ, picks: unknown): picks is string[] {
  if (!Array.isArray(picks) || picks.length < 1 || picks.length > q.maxPicks) return false;
  const ids = new Set(q.options.map((o) => o.id));
  return new Set(picks).size === picks.length && picks.every((p) => typeof p === 'string' && ids.has(p));
}
