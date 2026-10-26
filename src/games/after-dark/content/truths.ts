import type { Prompt } from './taxonomy';

const t = (id: string, level: Prompt['level'], category: Prompt['category'], text: string): Prompt => ({ id: `t-${id}`, level, category, text });

/** Truths: questions answered out loud or in writing. */
export const TRUTHS: Prompt[] = [
  // Level 1 - Flirty
  t('first-attract', 1, 'flirty', 'What was the first thing you found attractive about me?'),
  t('compliment-smile', 1, 'compliments', 'Which compliment from me makes you smile straight away?'),
  t('get-attention', 1, 'flirty', 'What is your favourite way for me to get your attention?'),
  t('crush-moment', 1, 'romantic', 'When did you realise you had a proper crush on me?'),
  t('best-look', 1, 'compliments', 'When do you think I look my absolute best?'),
  t('flirt-text', 1, 'flirty', 'What is the most flirtatious message I have ever sent you?'),
  t('voice', 1, 'flirty', 'Is there a way I say your name that you secretly love?'),
  t('first-kiss-think', 1, 'kissing', 'Before our first kiss, how long had you been thinking about it?'),
  t('date-outfit', 1, 'dates', 'What outfit of mine would you pick for our next date?'),
  t('cheeky-habit', 1, 'playful', 'Which of my habits is secretly attractive to you?'),
  t('feel-wanted', 1, 'desires', 'What small thing makes you feel wanted during an ordinary day?'),
  t('ideal-evening', 1, 'dates', 'Describe the perfect relaxed evening in with me in three words.'),
  // Level 2 - Steamy
  t('kiss-type', 2, 'kissing', 'What kind of kiss do you enjoy most?'),
  t('romantic-special', 2, 'romantic', 'What turns an ordinary evening into a romantic one for you?'),
  t('spontaneous-planned', 2, 'romantic', 'Do you prefer spontaneous affection or a planned romantic moment? Why?'),
  t('especially-wanted', 2, 'desires', 'What makes you feel especially wanted by me?'),
  t('best-kiss', 2, 'kissing', 'Describe the best kiss we have ever shared. Where were we?'),
  t('anticipation', 2, 'flirty', 'What is something I do that builds anticipation for you?'),
  t('touch', 2, 'romantic', 'What kind of everyday touch from me do you love most?'),
  t('dress-up', 2, 'dates', 'Would you rather I dressed up for you or kept it casual and cosy? Which version of me are you thinking of?'),
  t('compliment-hidden', 2, 'compliments', 'What do you find attractive about me that I probably do not realise?'),
  t('miss-most', 2, 'romantic', 'When we are apart, what do you miss most?'),
  t('slow-dance', 2, 'romantic', 'Where would you most like to slow dance with me?'),
  t('tease', 2, 'playful', 'What is the most effective way I tease you?'),
  // Level 3 - Hot Seat
  t('flirty-unsaid', 3, 'bold', 'What is something flirty you have wanted to tell me but have not yet?'),
  t('initiative', 3, 'desires', 'What kind of romantic initiative from me do you enjoy most?'),
  t('anticipation-exciting', 3, 'desires', 'What makes anticipation exciting for you?'),
  t('plan-together', 3, 'dates', 'Is there a romantic experience you would love us to plan together?'),
  t('most-attractive-moment', 3, 'bold', 'Describe a moment you found me so attractive you lost your train of thought.'),
  t('kiss-where', 3, 'kissing', 'Where is the most unexpected place you have wanted to kiss me?'),
  t('confidence', 3, 'compliments', 'When do I seem most confident to you, and how does it make you feel?'),
  t('lead', 3, 'desires', 'Do you prefer when I take the lead, or when you do?'),
  t('daydream', 3, 'bold', 'What is a daydream about us you would admit to right now?'),
  t('chemistry', 3, 'flirty', 'When did you first notice our chemistry was something special?'),
  t('weekend-away', 3, 'dates', 'If we had a whole weekend away with no plans, how would you want the first evening to go?'),
  t('never-tried', 3, 'desires', 'Is there something romantic we have never tried that you are curious about?'),
  // Level 4 - Dare Night (truths that pair with dares)
  t('boldest-thought', 4, 'bold', 'What is the boldest thought you have had about me this week?'),
  t('perfect-night', 4, 'desires', 'Describe your perfect intimate date night, from start to finish, as far as you are comfortable.'),
  t('signal', 4, 'playful', 'If we had a secret signal for "let us go home early", what would it be?'),
  t('irresistible', 4, 'compliments', 'What do I do that you find completely irresistible?'),
  t('kiss-lesson', 4, 'kissing', 'If you could teach me one thing about how you like to be kissed, what would it be?'),
  t('pace', 4, 'desires', 'What helps you feel relaxed and close when we are taking things slowly?'),
  t('fantasy-date', 4, 'dates', 'What is the most romantic fantasy date you have ever imagined for us?'),
  t('wear', 4, 'flirty', 'What would you love me to wear on a night that is just for us?'),
  t('remember-night', 4, 'romantic', 'Which night together would you happily relive, and why?'),
  t('new-together', 4, 'bold', 'What is one new thing you would like us to explore together, at a pace that suits us both?'),
  t('admire', 4, 'compliments', 'Tell me three things you admire about how I love you.'),
  t('tonight', 4, 'flirty', 'If tonight could go exactly how you wanted, how would it begin?'),
];
