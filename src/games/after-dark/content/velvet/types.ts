/**
 * VELVET: Body & Desire content model. Every item is prewritten and
 * tap-based: no free text anywhere. Content is data only, kept apart from UI.
 */

export type VCat = 'body' | 'arousal' | 'pleasure' | 'theatre' | 'atlas' | 'talk' | 'secret' | 'predict' | 'vault';

/**
 * choice  - personal preference, four options (single or multi-select)
 * scale   - Pleasure Preferences five-point card
 * atlas   - Kink & Fetish Atlas five-point card
 * secret  - private selection with reveal permissions chosen by the player
 * predict - one partner answers about themselves, the other predicts
 */
export type VKind = 'choice' | 'scale' | 'atlas' | 'secret' | 'predict';
export type Intensity = 1 | 2 | 3 | 4 | 5;
export type Reveal = 'simultaneous' | 'permission';

export interface VOption {
  id: string;
  text: string;
}

export interface VItem {
  id: string;
  cat: VCat;
  kind: VKind;
  intensity: Intensity;
  /** Velvet Vault stage this item can appear in (1-5). */
  stage: Intensity;
  /** Short descriptive introduction (scenarios, atlas cards). */
  setup?: string;
  text: string;
  /** Predict items: the predicting partner's wording; {name} is the answerer. */
  them?: string;
  options: VOption[];
  /** 1 = single, 2 = "Choose up to 2", 4 = "Select all that apply". */
  maxPicks: 1 | 2 | 4;
  /** Atlas only: grouping and search terms. */
  group?: string;
  tags?: string[];
  followUp: FollowId;
  /** 'permission' items let the player choose: reveal together, reveal now, or keep private. */
  reveal: Reveal;
  skippable: true;
}

/* ---------------------------------- scales --------------------------------- */

export const PLEASURE_SCALE: VOption[] = [
  { id: 'yes', text: 'Interested' },
  { id: 'curious', text: 'Curious' },
  { id: 'unsure', text: 'Unsure' },
  { id: 'no', text: 'Not interested' },
  { id: 'private', text: 'Keep private' },
];

export const ATLAS_SCALE: VOption[] = [
  { id: 'yes', text: 'Definitely interested' },
  { id: 'curious', text: 'Curious' },
  { id: 'discuss', text: 'Interested only after discussion' },
  { id: 'no', text: 'Not interested' },
  { id: 'private', text: 'Keep private' },
];

export const SHARE_OPTIONS = [
  { id: 'together', text: 'Reveal after both players answer' },
  { id: 'now', text: 'Reveal my selection now' },
  { id: 'private', text: 'Keep my selection private' },
] as const;

/* -------------------------------- follow-ups ------------------------------- */

export type FollowId = 'next' | 'settled' | 'draw' | 'when' | 'learned' | 'learn-me' | 'scene' | 'conditions' | 'comfort' | 'predicted' | 'pace' | 'say';

/** Predefined follow-up MCQs: tap-only, optional, never graded. */
export const FOLLOW_UPS: Record<FollowId, { text: string; options: VOption[] }> = {
  next: { text: 'So... what now?', options: opts(['Show me tonight', 'Remind me soon', 'Let me think about it', 'Our little secret']) },
  settled: { text: 'Is that always true for you?', options: opts(['Always', 'Depends on my mood', 'Only when you start it', 'I am still finding out']) },
  draw: { text: 'What makes it so good?', options: opts(['The way it feels', 'Seeing your reaction', 'The thrill of something new', 'Feeling completely wanted']) },
  when: { text: 'When do you want it most?', options: opts(['Late at night', 'First thing in the morning', 'The moment we get home', 'Whenever you start it']) },
  learned: { text: 'Did that surprise you?', options: opts(['Completely', 'A little', 'I guessed it', 'Now I want to find out more']) },
  'learn-me': { text: 'How should your partner discover this?', options: opts(['Ask me in a whisper', 'Let me guide your hands', 'Find out slowly', 'Just try it and watch me']) },
  scene: { text: 'Which part of the scene got you?', options: opts(['The setting', 'The roles', 'The tension', 'The moment it finally happens']) },
  conditions: { text: 'If we ever tried it, how would you want it to start?', options: opts(['Talk it through first, then tease', 'Agree a stop word, then play', 'Very slowly, one step at a time', 'Just a fantasy, nothing more']) },
  comfort: { text: 'How did it feel to answer that?', options: opts(['Exciting', 'A little shy', 'Bolder than I expected', 'Ask me something gentler next']) },
  predicted: { text: 'How well do you know each other?', options: opts(['Too well', 'Better than I thought', 'You surprised me', 'Now I am curious']) },
  pace: { text: 'Do you want more of this?', options: opts(['Much more', 'About the same', 'Less, honestly', 'Depends on the night']) },
  say: { text: 'Could you say this to your partner in the moment?', options: opts(['Easily', 'With a look instead', 'Afterwards, whispering', 'Only in this game']) },
};

/* ------------------------------- categories -------------------------------- */

export const VELVET_CATS: { id: VCat; n: number; title: string; detail: string }[] = [
  { id: 'body', n: 1, title: 'Body Map', detail: 'Where, how and how slowly you want to be touched' },
  { id: 'arousal', n: 2, title: 'Arousal & Stimulation', detail: 'Pace, pressure, teasing and what drives you wild' },
  { id: 'pleasure', n: 3, title: 'Pleasure Preferences', detail: 'What you enjoy, are curious about, or would rather not' },
  { id: 'theatre', n: 4, title: 'Fantasy Theatre', detail: 'Fictional adult scenarios with four directions' },
  { id: 'atlas', n: 5, title: 'Kink & Fetish Atlas', detail: 'A searchable library of consensual interests' },
  { id: 'talk', n: 6, title: 'Intimate Communication', detail: 'Whispers, words, signals and saying what you want' },
  { id: 'secret', n: 7, title: 'Secret Curiosities', detail: 'Select privately, then choose who sees it' },
  { id: 'predict', n: 9, title: 'Preference Predictions', detail: 'Predict your partner\'s selection, then reveal' },
  { id: 'vault', n: 10, title: 'The Velvet Vault', detail: 'Five progressively more personal stages' },
];

/** Velvet Vault stages: each player opts into each one independently. */
export const VAULT_STAGES: { n: Intensity; title: string; cats: VCat[] }[] = [
  { n: 1, title: 'Your body, my hands', cats: ['body'] },
  { n: 2, title: 'Turn me on', cats: ['arousal', 'talk'] },
  { n: 3, title: 'What I really want', cats: ['pleasure', 'secret'] },
  { n: 4, title: 'Fantasy & roleplay', cats: ['theatre', 'predict'] },
  { n: 5, title: 'Kinks & fetishes', cats: ['atlas'] },
];

const STAGE_OF: Record<VCat, Intensity> = { body: 1, arousal: 2, talk: 2, pleasure: 3, secret: 3, theatre: 4, predict: 4, atlas: 5, vault: 1 };

/* --------------------------------- helpers --------------------------------- */

export function opts(texts: string[]): VOption[] {
  return texts.map((text, i) => ({ id: String.fromCharCode(97 + i), text }));
}

type Extra = { setup?: string; picks?: 1 | 2 | 4; intensity?: Intensity; follow?: FollowId };

/** Four-option preference question. */
export function pick(cat: VCat, id: string, text: string, options: string[], follow: FollowId, extra: Extra = {}): VItem {
  return {
    id: `v-${id}`,
    cat,
    kind: 'choice',
    intensity: extra.intensity ?? STAGE_OF[cat],
    stage: STAGE_OF[cat],
    text,
    options: opts(options),
    maxPicks: extra.picks ?? 1,
    followUp: extra.follow ?? follow,
    reveal: 'simultaneous',
    skippable: true,
    ...(extra.setup ? { setup: extra.setup } : {}),
  };
}

/** Pleasure Preferences card on the five-point scale. */
export function card(id: string, text: string, setup: string, intensity: Intensity = 3): VItem {
  return { id: `v-${id}`, cat: 'pleasure', kind: 'scale', intensity, stage: 3, text, setup, options: PLEASURE_SCALE, maxPicks: 1, followUp: 'next', reveal: 'permission', skippable: true };
}

/** Kink & Fetish Atlas card. */
export function atlas(id: string, group: string, text: string, setup: string, tags: string[], intensity: Intensity = 5): VItem {
  return { id: `v-${id}`, cat: 'atlas', kind: 'atlas', intensity, stage: 5, group, tags, text, setup, options: ATLAS_SCALE, maxPicks: 1, followUp: 'conditions', reveal: 'permission', skippable: true };
}

/** Secret Curiosity: selections the player may reveal together, now, or never. */
export function secret(id: string, text: string, options: string[], picks: 1 | 2 | 4 = 2): VItem {
  return { id: `v-${id}`, cat: 'secret', kind: 'secret', intensity: 4, stage: 3, text, options: opts(options), maxPicks: picks, followUp: 'next', reveal: 'permission', skippable: true };
}

/** Preference Prediction. */
export function predict(id: string, text: string, them: string, options: string[], intensity: Intensity = 4): VItem {
  return { id: `v-${id}`, cat: 'predict', kind: 'predict', intensity, stage: 4, text, them, options: opts(options), maxPicks: 1, followUp: 'predicted', reveal: 'simultaneous', skippable: true };
}
