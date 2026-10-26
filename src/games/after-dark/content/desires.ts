import type { Prompt } from './taxonomy';

const s = (id: string, level: Prompt['level'], category: Prompt['category'], text: string): Prompt => ({ id: `s-${id}`, level, category, text });

/** Secret Desires: personal prompts with per-answer sharing controls. */
export const DESIRES: Prompt[] = [
  s('desired', 1, 'desires', 'What makes you feel most desired?'),
  s('attention', 1, 'romantic', 'What kind of romantic attention do you wish happened more often?'),
  s('compliment-want', 1, 'compliments', 'What compliment would you love to hear from me more often?'),
  s('ideal-evening', 1, 'dates', 'What would your ideal romantic evening look like?'),
  s('understand', 2, 'desires', 'What is a preference you would like me to understand better?'),
  s('anticipation', 2, 'desires', 'What could I do earlier in the day to build anticipation for the evening?'),
  s('kiss-wish', 2, 'kissing', 'Is there a kind of kiss you wish we shared more often?'),
  s('closest', 2, 'romantic', 'When do you feel physically closest to me?'),
  s('flirt-more', 2, 'flirty', 'How would you like me to flirt with you more?'),
  s('surprise', 2, 'dates', 'What romantic surprise would sweep you off your feet?'),
  s('explore', 3, 'desires', 'What would you like to explore together, at a pace that feels comfortable?'),
  s('confident', 3, 'bold', 'When do you feel most confident and attractive with me?'),
  s('initiate', 3, 'desires', 'How would you like me to initiate a romantic evening?'),
  s('unsaid', 3, 'bold', 'What is something you have wanted to ask me but have held back?'),
  s('mood', 3, 'romantic', 'What sets the mood for you instantly?'),
  s('slow-down', 3, 'desires', 'What helps you feel safe to slow down and enjoy the moment?'),
  s('fantasy-date', 3, 'dates', 'Describe a fantasy date you have never told me about.'),
  s('boundary', 3, 'desires', 'Is there a boundary you would like me to know about, or to revisit?'),
  s('tonight-wish', 4, 'desires', 'If you could ask for one thing tonight, what would it be?'),
  s('bold-wish', 4, 'bold', 'What is a bold wish you would only share with me?'),
  s('lead-wish', 4, 'desires', 'How do you feel about taking turns leading? What would that look like?'),
  s('remember', 4, 'romantic', 'What moment between us still makes your heart race when you think about it?'),
  s('try-new', 4, 'desires', 'What is something new you would like us to try, and what would make it feel right?'),
  s('signal', 4, 'playful', 'What signal from me would tell you exactly what I am thinking?'),
];
