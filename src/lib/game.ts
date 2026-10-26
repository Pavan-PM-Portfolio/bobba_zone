import type { Category, Mode, PlayerNumber, RevealedAnswers, RoundBreakdown } from './types';

export const ROUNDS: { id: Category; title: string; blurb: string }[] = [
  { id: 'romance', title: 'Love & Romance', blurb: 'Sweet gestures and small rituals' },
  { id: 'chaotic', title: 'Funny & Chaotic', blurb: 'The lovable mess of everyday life' },
  { id: 'understanding', title: 'Understanding Each Other', blurb: 'How you notice, repair and reassure' },
  { id: 'future', title: 'Future Together', blurb: 'Plans, dreams and adventures ahead' },
];

export const MODES: { id: Mode; title: string; perRound: number; detail: string }[] = [
  { id: 'quick', title: 'Quick play', perRound: 3, detail: 'About 5 minutes' },
  { id: 'standard', title: 'Standard', perRound: 6, detail: 'About 15 minutes' },
  { id: 'full', title: 'Full game', perRound: 15, detail: 'An evening together' },
];

export function roundTitle(c: Category): string {
  return ROUNDS.find((r) => r.id === c)?.title ?? c;
}

export function questionCount(mode: Mode, rounds: Category[]): number {
  const per = MODES.find((m) => m.id === mode)?.perRound ?? 6;
  return per * (rounds.length || ROUNDS.length);
}

/** Uppercase, strip anything that isn't A-Z/0-9 (matches the server). */
export function normalizeInviteCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export const INVITE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

export function isWellFormedInviteCode(raw: string): boolean {
  return INVITE_CODE_PATTERN.test(normalizeInviteCode(raw));
}

/** "ABCD2345" -> "ABCD 2345" for reading aloud. */
export function formatInviteCode(code: string): string {
  const c = normalizeInviteCode(code);
  return c.length === 8 ? `${c.slice(0, 4)} ${c.slice(4)}` : c;
}

/**
 * Invite links use a hash route so they work on GitHub Pages under a
 * repository subpath without any server rewrites:
 *   https://user.github.io/repo/#/join/ABCD2345
 */
export function buildInviteUrl(code: string, origin: string, basePath: string): string {
  const base = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${origin}${base}#/join/${normalizeInviteCode(code)}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return Array.from(parts[0]!)[0]!.toUpperCase();
  return (Array.from(parts[0]!)[0]! + Array.from(parts[parts.length - 1]!)[0]!).toUpperCase();
}

export function didMatch(answers: RevealedAnswers | null | undefined): boolean | null {
  if (!answers?.p1 || !answers?.p2) return null;
  return answers.p1 === answers.p2;
}

/** Client-side mirror of the server formula, for display/sanity checks only. */
export function agreementPercentage(matching: number, answered: number): number {
  if (answered <= 0) return 0;
  return Math.round((matching / answered) * 10000) / 100;
}

export function roundPercent(r: RoundBreakdown): number | null {
  return r.answered > 0 ? agreementPercentage(r.matching, r.answered) : null;
}

/**
 * Neutral copy for a reveal. Never frames either partner as "winning" and
 * never treats an answer as a verdict on the relationship.
 */
export function revealInterpretation(
  answers: RevealedAnswers,
  names: Record<PlayerNumber, string>,
  seed: number,
): string {
  const p1 = answers.p1!;
  const p2 = answers.p2!;
  const pick = (list: string[]) => list[Math.abs(seed) % list.length]!;
  if (p1 === p2) {
    const who = names[p1];
    return pick([`You both see ${who} this way.`, `You both chose ${who}.`, `Same answer from both of you: ${who}.`]);
  }
  if (p1 === 1 && p2 === 2) {
    return pick(['You each picked yourself. Maybe it is something you both do.', 'You each raised your own hand on this one.']);
  }
  return pick(['You each picked the other. Worth comparing notes.', 'You each pointed at your partner. This might be worth talking about.']);
}

export function finalMessage(pct: number, answered: number): string {
  if (answered === 0) return 'Every question was skipped, so there is no score this time.';
  if (pct >= 80) return 'You see each other in very similar ways.';
  if (pct >= 55) return 'Mostly on the same page, with a few surprises worth talking about.';
  if (pct >= 30) return 'Plenty of different views. Good material for a conversation.';
  return 'You see these moments quite differently, which is worth exploring together.';
}
