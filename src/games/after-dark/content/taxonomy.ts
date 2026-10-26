export type Level = 1 | 2 | 3 | 4;
export type Category = 'flirty' | 'romantic' | 'compliments' | 'bold' | 'kissing' | 'dates' | 'playful' | 'desires';
export type ContentType = 'questions' | 'challenges' | 'mix';

export const LEVELS: { n: 1 | 2 | 3 | 4 | 5; title: string; detail: string }[] = [
  { n: 1, title: 'Flirty Curiosity', detail: 'Attraction, teasing, compliments and playful chemistry.' },
  { n: 2, title: 'Steamy Imagination', detail: 'Romantic tension, kisses and anticipation.' },
  { n: 3, title: 'Bold Desires', detail: 'Feeling wanted, dynamics and fantasies you are comfortable discussing.' },
  { n: 4, title: 'Deep Intimacy', detail: 'Vulnerability, trust, communication and boundaries. Also unlocks bolder dares.' },
  { n: 5, title: 'Our Secret World', detail: 'Imaginative adult scenarios, limited to the categories you both choose.' },
];

/** Older card modes top out at level 4; Level 5 unlocks the Question Game's most personal questions. */
export const contentCap = (level: number): Level => (Math.min(4, Math.max(1, level)) as Level);
export const levelTitle = (n: number) => LEVELS.find((l) => l.n === n)?.title ?? 'Flirty Curiosity';

export const CATEGORIES: { id: Category; title: string; detail: string }[] = [
  { id: 'flirty', title: 'Flirty', detail: 'Teasing and banter' },
  { id: 'romantic', title: 'Romantic', detail: 'Feelings and gestures' },
  { id: 'compliments', title: 'Compliments', detail: 'Saying what you like' },
  { id: 'bold', title: 'Bold questions', detail: 'Honest and a little daring' },
  { id: 'kissing', title: 'Kissing', detail: 'Preferences and moments' },
  { id: 'dates', title: 'Date-night ideas', detail: 'Plans and fantasies' },
  { id: 'playful', title: 'Playful challenges', detail: 'Small dares and games' },
  { id: 'desires', title: 'Desires & boundaries', detail: 'What you want, at your pace' },
];

export const categoryTitle = (c: string) => CATEGORIES.find((x) => x.id === c)?.title ?? c;

export interface Terms {
  me_ready: boolean;
  partner_ready: boolean;
  agreed: boolean;
  level?: number;
  categories?: Category[];
  type?: ContentType;
  type_conflict?: boolean;
}

export interface Setup {
  adult: boolean;
  consent: boolean;
  level: number;
  include: Category[];
  type: ContentType;
}

export interface Prompt {
  id: string;
  level: Level;
  category: Category;
  text: string;
}

/** True when a prompt is allowed by the agreed terms. */
export function allowed(p: { level: Level; category: Category }, t: Terms): boolean {
  if (!t.agreed || !t.level || !t.categories) return false;
  return p.level <= contentCap(t.level) && t.categories.includes(p.category);
}
