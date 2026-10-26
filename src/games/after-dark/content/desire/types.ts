/**
 * Desire Mode content model. Content lives here, separate from the UI, so the
 * library can grow without touching game code.
 */

export type DesireCat = 'turnons' | 'touch' | 'kink' | 'fantasy' | 'lead' | 'sensory' | 'secret' | 'match' | 'two';

/**
 * choice  - four options, pick one (or up to two when maxPicks is 2)
 * scale   - a kink or curiosity topic answered on the five-point interest scale
 * secret  - a private curiosity; the player decides who may ever see the answer
 * predict - one partner answers about themselves, the other predicts
 */
export type DesireKind = 'choice' | 'scale' | 'secret' | 'predict';

export interface DesireOption {
  id: string;
  text: string;
}

export interface DesireQ {
  id: string;
  cat: DesireCat;
  kind: DesireKind;
  /** 1-5, matching the Intensity Ladder stage the topic belongs to. */
  intensity: 1 | 2 | 3 | 4 | 5;
  /** Optional descriptive setup shown above the question. */
  setup?: string;
  text: string;
  /** Predict questions: what the predicting partner sees. {name} = the answerer. */
  them?: string;
  options: DesireOption[];
  maxPicks: 1 | 2;
  followUp: string;
}

export const SCALE: DesireOption[] = [
  { id: 'yes', text: 'Interested' },
  { id: 'curious', text: 'Curious' },
  { id: 'unsure', text: 'Unsure' },
  { id: 'no', text: 'Not interested' },
  { id: 'pass', text: 'Prefer not to answer' },
];
export const OPEN = ['yes', 'curious'];

export const DESIRE_CATS: { id: DesireCat; title: string; detail: string; stage: 1 | 2 | 3 | 4 | 5 }[] = [
  { id: 'turnons', title: 'Turn-On Discovery', detail: 'What creates attraction and anticipation', stage: 1 },
  { id: 'lead', title: 'Who Takes the Lead?', detail: 'Initiation and the dynamics you enjoy', stage: 1 },
  { id: 'touch', title: 'Kissing & Touch', detail: 'Pace, style and what feels good', stage: 2 },
  { id: 'sensory', title: 'Sensory Preferences', detail: 'Light, sound, scent, temperature, words', stage: 2 },
  { id: 'kink', title: 'Fetish & Kink Discovery', detail: 'Topics rated from interested to not for you', stage: 3 },
  { id: 'fantasy', title: 'Fantasy Scenarios', detail: 'Imagined scenes and the kind you would choose', stage: 4 },
  { id: 'two', title: 'Choose Two: Desire Edition', detail: 'Pick the two that appeal most', stage: 4 },
  { id: 'secret', title: 'Secret Curiosities', detail: 'You decide whether it is ever shared', stage: 5 },
  { id: 'match', title: 'Fantasy Preference Match', detail: 'One answers, the other predicts', stage: 5 },
];

export const LADDER: { n: 1 | 2 | 3 | 4 | 5; title: string; detail: string; cats: DesireCat[] }[] = [
  { n: 1, title: 'Attraction & turn-ons', detail: 'What draws you in.', cats: ['turnons', 'lead'] },
  { n: 2, title: 'Physical & sensory', detail: 'Kissing, touch and atmosphere.', cats: ['touch', 'sensory'] },
  { n: 3, title: 'Fetishes & kinks', detail: 'Topics you rate privately, revealed together.', cats: ['kink'] },
  { n: 4, title: 'Fantasy scenarios', detail: 'Imagined scenes and combinations.', cats: ['fantasy', 'two'] },
  { n: 5, title: 'Personal curiosities', detail: 'Private by default. Shared only if you choose.', cats: ['secret', 'match'] },
];

export const catTitle = (c: DesireCat) => DESIRE_CATS.find((x) => x.id === c)?.title ?? c;
const stageOf = (c: DesireCat) => DESIRE_CATS.find((x) => x.id === c)!.stage;

const opts = (texts: string[]): DesireOption[] => texts.map((text, i) => ({ id: String.fromCharCode(97 + i), text }));

/** Four-option question. */
export function choice(cat: DesireCat, id: string, text: string, options: string[], followUp: string, extra: { setup?: string; two?: boolean; intensity?: DesireQ['intensity'] } = {}): DesireQ {
  return {
    id: `d-${id}`,
    cat,
    kind: 'choice',
    intensity: extra.intensity ?? stageOf(cat),
    text,
    options: opts(options),
    maxPicks: extra.two ? 2 : 1,
    followUp,
    ...(extra.setup ? { setup: extra.setup } : {}),
  };
}

/** Kink topic on the five-point scale. `text` names the topic; `setup` describes it neutrally. */
export function scale(id: string, text: string, setup: string, followUp: string): DesireQ {
  return { id: `d-${id}`, cat: 'kink', kind: 'scale', intensity: 3, text, setup, options: SCALE, maxPicks: 1, followUp };
}

/** Secret curiosity: the player decides how (or whether) it is shared. */
export function secret(id: string, text: string, options: string[], followUp: string, two = false): DesireQ {
  return { id: `d-${id}`, cat: 'secret', kind: 'secret', intensity: 5, text, options: opts(options), maxPicks: two ? 2 : 1, followUp };
}

/** Preference match: text is for the answerer, them for the predictor. */
export function predict(id: string, text: string, them: string, options: string[], followUp: string): DesireQ {
  return { id: `d-${id}`, cat: 'match', kind: 'predict', intensity: 5, text, them, options: opts(options), maxPicks: 1, followUp };
}
