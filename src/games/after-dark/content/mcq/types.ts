import type { Category } from '../taxonomy';

export type McqLevel = 1 | 2 | 3 | 4 | 5;
export type Deck = 'fantasy' | 'emotional' | 'deep' | 'forbidden' | 'cinematic' | 'mind' | 'two';

/**
 * Each option carries a theme so follow-ups can respond to what was
 * actually chosen, without pretending to read anything deeper into it.
 */
export type Theme =
  | 'closeness'
  | 'play'
  | 'talk'
  | 'surprise'
  | 'plan'
  | 'slow'
  | 'lead'
  | 'follow'
  | 'words'
  | 'touch'
  | 'space'
  | 'mystery'
  | 'together'
  | 'safety'
  | 'adventure';

export interface McqOption {
  id: string;
  text: string;
  theme: Theme;
}

export interface Mcq {
  id: string;
  deck: Deck;
  level: McqLevel;
  category: Category;
  /** Question as shown to someone answering for themselves. */
  text: string;
  /** Predictive questions: shown to the partner who guesses ({name} = the answerer). */
  them?: string;
  /** Cinematic scenes are told in three short beats before the question. */
  scene?: { setting: string; atmosphere: string; situation: string };
  options: McqOption[];
  /** 1 = single answer, 2 = "Choose up to 2", 4 = "Select all that apply". */
  maxPicks: 1 | 2 | 4;
  followUp: string;
  kind: 'independent' | 'predictive';
  reveal: 'simultaneous';
  skippable: true;
}

/** Compact authoring helper: options are written as "theme|text". */
export function mcq(
  id: string,
  deck: Deck,
  level: McqLevel,
  category: Category,
  text: string,
  options: string[],
  followUp: string,
  extra: Partial<Pick<Mcq, 'them' | 'scene' | 'maxPicks'>> = {},
): Mcq {
  return {
    id: `q-${id}`,
    deck,
    level,
    category,
    text,
    options: options.map((o, i) => {
      const [theme, ...rest] = o.split('|');
      return { id: String.fromCharCode(97 + i), theme: theme as Theme, text: rest.join('|') };
    }),
    maxPicks: extra.maxPicks ?? 1,
    followUp,
    kind: deck === 'mind' ? 'predictive' : 'independent',
    reveal: 'simultaneous',
    skippable: true,
    ...(extra.them ? { them: extra.them } : {}),
    ...(extra.scene ? { scene: extra.scene } : {}),
  };
}

export const DECKS: { id: Deck; title: string; detail: string }[] = [
  { id: 'fantasy', title: 'Choose Your Fantasy', detail: 'Imagined moments and how you would want them to go' },
  { id: 'emotional', title: 'What Turns You On Emotionally?', detail: 'Desire, attention and feeling wanted' },
  { id: 'deep', title: 'Deep Desires, Honestly', detail: 'Needs, expectations and what you wish was understood' },
  { id: 'forbidden', title: 'Forbidden-Feeling Scenarios', detail: 'Curiosity, vulnerability and boundaries' },
  { id: 'cinematic', title: 'The Cinematic Choice', detail: 'Longer scenes with atmosphere and a decision' },
  { id: 'mind', title: 'Read My Mind', detail: 'One answers, the other predicts' },
  { id: 'two', title: 'Choose Two', detail: 'No easy answers: pick a combination' },
];

export const MCQ_LEVELS: { n: McqLevel; title: string; detail: string }[] = [
  { n: 1, title: 'Flirty Curiosity', detail: 'Attraction, teasing, compliments and playful chemistry.' },
  { n: 2, title: 'Steamy Imagination', detail: 'Romantic tension, kisses and anticipation.' },
  { n: 3, title: 'Bold Desires', detail: 'Feeling wanted, dynamics, fantasies you are comfortable discussing.' },
  { n: 4, title: 'Deep Intimacy', detail: 'Vulnerability, trust, communication and boundaries.' },
  { n: 5, title: 'Our Secret World', detail: 'Imaginative scenarios and more personal preferences.' },
];

/** Follow-ups offered after a reveal, matched to the theme of the option you chose. */
export const THEME_FOLLOW_UPS: Record<Theme, string> = {
  closeness: 'What helps you feel emotionally close in that moment?',
  play: 'What kind of playful moment would you enjoy most right now?',
  talk: 'What would you want to talk about first?',
  surprise: 'What kind of surprise would you enjoy most?',
  plan: 'What would you want to discuss before trying something new?',
  slow: 'What does "unhurried" look like for you?',
  lead: 'What does taking the lead look like when it feels good to you?',
  follow: 'What would you love your partner to plan or decide for you?',
  words: 'What words would you most like to hear?',
  touch: 'What kind of affection feels most welcome to you?',
  space: 'What helps you feel ready to reconnect after a little space?',
  mystery: 'What makes the unknown feel exciting rather than stressful for you?',
  together: 'What would you decide together, and what would you leave to chance?',
  safety: 'What would make this feel safer to share?',
  adventure: 'If there were no limits on time or place, where would you take this?',
};
