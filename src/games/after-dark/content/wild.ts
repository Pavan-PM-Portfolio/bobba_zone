import type { Category, Level } from './taxonomy';
import { TRUTHS } from './truths';
import { DARES } from './dares';
import { PICKS } from './picks';

export type WildKind = 'question' | 'choice' | 'scenario' | 'challenge' | 'reflection';
export interface Wildcard {
  id: string;
  kind: WildKind;
  level: Level;
  category: Category;
  text: string;
}

const w = (id: string, kind: WildKind, level: Level, category: Category, text: string): Wildcard => ({ id: `w-${id}`, kind, level, category, text });

const EXTRA: Wildcard[] = [
  w('sc-lift', 'scenario', 1, 'flirty', 'You are stuck in a lift together for an hour. How do you pass the time?'),
  w('sc-strangers', 'scenario', 2, 'flirty', 'You meet at a bar pretending to be strangers. What is your opening line?'),
  w('sc-power-cut', 'scenario', 2, 'romantic', 'The power goes out on a rainy night. Describe the next hour.'),
  w('sc-hotel', 'scenario', 3, 'dates', 'You wake up in a hotel room with a view of the sea. What is the plan for the day?'),
  w('sc-letter', 'scenario', 3, 'romantic', 'You find a letter your partner wrote you ten years from now. What does it say?'),
  w('sc-masquerade', 'scenario', 3, 'flirty', 'At a masquerade ball you have to find each other without speaking. How?'),
  w('sc-roadtrip', 'scenario', 2, 'dates', 'A spontaneous road trip with one rule: no planning. Where do you end up?'),
  w('sc-secret-date', 'scenario', 4, 'bold', 'You each plan half of a secret date. Describe your half in three words.'),
  w('sc-rain', 'scenario', 2, 'kissing', 'Caught in the rain without an umbrella. What happens next?'),
  w('sc-dance', 'scenario', 3, 'playful', 'A stranger asks your partner to dance. How do you win them back, playfully?'),
  w('rf-grateful', 'reflection', 1, 'romantic', 'Name one thing about tonight you are grateful for.'),
  w('rf-changed', 'reflection', 2, 'romantic', 'How has the way you flirt with each other changed since you met?'),
  w('rf-safe', 'reflection', 3, 'desires', 'What makes it easy to say yes, no or not yet with each other?'),
  w('rf-proud', 'reflection', 2, 'compliments', 'What are you proud of about how you two love each other?'),
  w('rf-pace', 'reflection', 3, 'desires', 'Is our current pace right for you? Faster, slower or just right?'),
  w('rf-tradition', 'reflection', 1, 'dates', 'What romantic tradition should we start this year?'),
  w('rf-spark', 'reflection', 2, 'flirty', 'What keeps the spark going for you on ordinary weeks?'),
  w('rf-check-in', 'reflection', 4, 'desires', 'Check in: how are you feeling about this game right now?'),
  w('ch-mirror', 'challenge', 1, 'playful', 'Mirror each other’s movements for thirty seconds without laughing.'),
  w('ch-poem', 'challenge', 2, 'romantic', 'Make up a four-line poem about your partner on the spot.'),
  w('ch-describe', 'challenge', 3, 'compliments', 'Describe your partner to them as if they were a stranger you could not stop looking at.'),
  w('ch-plan-kiss', 'challenge', 3, 'kissing', 'Plan the setting for your next memorable kiss: where, when and what music.'),
  w('ch-yes-day', 'challenge', 4, 'bold', 'Agree on a "yes evening": three small requests each, with a veto for anything either of you does not want.'),
  w('ch-countdown', 'challenge', 4, 'playful', 'Count down from ten slowly while your partner tries to make you smile.'),
];

/** The full wildcard deck: original cards plus truths, dares and choices from the other modes. */
export const WILDCARDS: Wildcard[] = [
  ...EXTRA,
  ...TRUTHS.map((t) => ({ id: `w-${t.id}`, kind: 'question' as const, level: t.level, category: t.category, text: t.text })),
  ...DARES.map((d) => ({ id: `w-${d.id}`, kind: 'challenge' as const, level: d.level, category: d.category, text: d.text })),
  ...PICKS.map((p) => ({ id: `w-${p.id}`, kind: 'choice' as const, level: p.level, category: p.category, text: `${p.a} or ${p.b}?` })),
];

export const isChallengeKind = (k: WildKind) => k === 'challenge';
