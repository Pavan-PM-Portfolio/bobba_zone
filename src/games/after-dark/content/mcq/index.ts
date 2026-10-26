import type { Deck, Mcq, McqLevel } from './types';
import type { Terms } from '../taxonomy';
import { LEVEL1 } from './level1';
import { LEVEL2 } from './level2';
import { LEVEL3 } from './level3';
import { LEVEL4 } from './level4';
import { LEVEL5 } from './level5';
import { CINEMATIC } from './cinematic';
import { MIND } from './mind';
import { TWO } from './two';
import { THEME_FOLLOW_UPS } from './types';

export * from './types';

export const ALL_MCQ: Mcq[] = [...LEVEL1, ...LEVEL2, ...LEVEL3, ...LEVEL4, ...LEVEL5, ...CINEMATIC, ...MIND, ...TWO];

const BY_ID = new Map(ALL_MCQ.map((q) => [q.id, q]));
export const mcqById = (id: string) => BY_ID.get(id);

/** Questions allowed by the agreed terms, at or below the level both have agreed to play. */
export function mcqPool(terms: Terms, decks: Deck[], level: McqLevel): Mcq[] {
  if (!terms.agreed || !terms.level || !terms.categories) return [];
  const cap = Math.min(level, terms.level);
  const cats = terms.categories;
  return ALL_MCQ.filter((q) => decks.includes(q.deck) && q.level <= cap && cats.includes(q.category));
}

/** Label shown above the options. */
export function pickLabel(q: Mcq): string | null {
  if (q.maxPicks === 2) return 'Choose up to 2';
  if (q.maxPicks === 4) return 'Select all that apply';
  return null;
}

/** Toggle an option while enforcing the question's selection rule. */
export function togglePick(q: Mcq, picks: string[], id: string): string[] {
  if (!q.options.some((o) => o.id === id)) return picks;
  if (picks.includes(id)) return picks.filter((p) => p !== id);
  if (q.maxPicks === 1) return [id];
  if (picks.length >= q.maxPicks) return picks;
  return [...picks, id];
}

/** True when the picks are a valid, non-empty answer for the question. */
export function validPicks(q: Mcq, picks: unknown): picks is string[] {
  if (!Array.isArray(picks) || picks.length < 1 || picks.length > q.maxPicks) return false;
  const ids = new Set(q.options.map((o) => o.id));
  return new Set(picks).size === picks.length && picks.every((p) => typeof p === 'string' && ids.has(p));
}

/** Follow-up for a player, based only on what they picked (first pick wins). */
export function followUpFor(q: Mcq, picks: string[]): string {
  const opt = q.options.find((o) => o.id === picks[0]);
  if (q.deck === 'mind' || !opt || picks.length > 1) return q.followUp;
  return THEME_FOLLOW_UPS[opt.theme] ?? q.followUp;
}

export interface Comparison {
  shared: string[];
  onlyA: string[];
  onlyB: string[];
  same: boolean;
}

export function compare(a: string[], b: string[]): Comparison {
  const shared = a.filter((x) => b.includes(x));
  return {
    shared,
    onlyA: a.filter((x) => !b.includes(x)),
    onlyB: b.filter((x) => !a.includes(x)),
    same: a.length === b.length && shared.length === a.length,
  };
}
