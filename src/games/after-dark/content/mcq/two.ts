import { mcq, type McqLevel } from './types';
import type { Category } from '../taxonomy';

function two(id: string, level: McqLevel, category: Category, text: string, options: string[], followUp: string, all = false) {
  return mcq(`t-${id}`, 'two', level, category, text, options, followUp, { maxPicks: all ? 4 : 2 });
}

/** Choose Two - No Easy Answers: combinations rather than single picks. */
export const TWO = [
  two('desired', 2, 'desires', 'Choose two things that make you feel most desired.', [
    'words|Being told, specifically, what they find attractive.',
    'touch|Affection that feels natural and welcome.',
    'lead|Them taking initiative.',
    'mystery|A look across a room.',
  ], 'Why that combination?'),
  two('anticipation', 2, 'flirty', 'Choose two qualities that make romantic anticipation exciting.', [
    'mystery|Not knowing the plan.',
    'words|Messages through the day.',
    'slow|Taking our time.',
    'play|Teasing.',
  ], 'Which matters more if you could only keep one?'),
  two('safe-share', 4, 'desires', 'Choose two things that help you feel safe sharing a personal desire.', [
    'safety|Knowing there is no judgement.',
    'space|Time to think first.',
    'play|A playful format, like this game.',
    'talk|Being asked gently.',
  ], 'Is there something you would share now?'),
  two('reconnect', 4, 'romantic', 'Choose two ways you prefer to reconnect after a misunderstanding.', [
    'talk|Talking it all through.',
    'touch|A long hug.',
    'space|A little time apart first.',
    'words|A sincere apology.',
  ], 'What usually happens instead?'),
  two('ideal-evening', 1, 'dates', 'Choose two ingredients for your ideal romantic evening.', [
    'slow|Good food, taken slowly.',
    'play|Music and dancing.',
    'talk|Deep conversation.',
    'surprise|A surprise.',
  ], 'Combine both partners\' picks into a plan.'),
  two('date-weekend', 1, 'dates', 'Choose two things for a perfect weekend together.', [
    'adventure|Somewhere new.',
    'slow|A lie-in.',
    'together|Cooking together.',
    'play|A game or a challenge.',
  ], 'Book it.'),
  two('compliments', 1, 'compliments', 'Choose two compliments you would most love to hear.', [
    'words|"You are beautiful."',
    'closeness|"You make everything better."',
    'play|"You are the funniest person I know."',
    'lead|"I admire how you handle things."',
  ], 'Give each other both.'),
  two('flirt', 1, 'flirty', 'Choose two ways you most enjoy being flirted with.', [
    'words|Compliments.',
    'play|Teasing.',
    'mystery|Eye contact.',
    'touch|Light touches.',
  ], 'Use them this week.'),
  two('kiss', 2, 'kissing', 'Choose two moments when a kiss feels best.', [
    'slow|Lazy mornings.',
    'surprise|In the middle of something ordinary.',
    'words|After saying something meaningful.',
    'adventure|Somewhere we should not.',
  ], 'Which is overdue?'),
  two('trust', 4, 'romantic', 'Choose two things that build trust between you.', [
    'words|Keeping promises.',
    'talk|Honesty when it is hard.',
    'closeness|Showing up consistently.',
    'safety|Accepting each other at our worst.',
  ], 'Which do you see most in your partner?'),
  two('turn-ons', 3, 'desires', 'Choose two emotional qualities you find most attractive.', [
    'lead|Confidence.',
    'slow|Patience.',
    'play|Playfulness.',
    'closeness|Attentiveness.',
  ], 'When does your partner show these?'),
  two('fantasy-ingredients', 5, 'bold', 'Choose two ingredients for a fantasy evening.', [
    'mystery|A secret plan.',
    'adventure|An unusual place.',
    'play|A game with rules.',
    'words|Saying exactly what we want.',
  ], 'What would the evening be called?'),
  two('vulnerable', 4, 'desires', 'Choose two things that help you feel safe being vulnerable.', [
    'slow|No rush.',
    'touch|Physical closeness.',
    'safety|Kind reactions.',
    'talk|Being asked questions.',
  ], 'What could your partner do more of?'),
  two('romance', 1, 'romantic', 'Choose two things that make romance feel real to you.', [
    'surprise|Small surprises.',
    'words|Words that mean something.',
    'together|Shared plans.',
    'touch|Everyday affection.',
  ], 'What is missing right now?'),
  two('play', 3, 'playful', 'Choose two playful games you would try together.', [
    'play|Strangers at a bar.',
    'mystery|A treasure hunt with notes.',
    'words|Truth or dare with pass cards.',
    'adventure|A dare date in a new place.',
  ], 'Pick one for this month.'),
  two('stress', 4, 'romantic', 'Choose two things you need when you are stressed.', [
    'space|Some space.',
    'touch|To be held.',
    'together|Practical help.',
    'talk|To vent.',
  ], 'Is it different from what your partner guessed?'),
  two('getaway', 2, 'dates', 'Choose two features of a dream getaway.', [
    'slow|No schedule.',
    'adventure|Somewhere exotic.',
    'closeness|Total privacy.',
    'play|Something we have never done.',
  ], 'Where would it be?'),
  two('mood-setters', 3, 'romantic', 'Choose two things that set the mood fastest for you.', [
    'slow|Low light.',
    'words|Something said with intent.',
    'touch|A lingering touch.',
    'play|Laughter.',
  ], 'Does your partner already know?'),
  two('new-experience', 3, 'desires', 'Choose two conditions for trying something new romantically.', [
    'talk|We discuss it first.',
    'slow|We start small.',
    'safety|Either of us can stop at any time.',
    'space|We decide separately, then together.',
  ], 'Curiosity is not consent. Which matters most?'),
  two('appreciation', 1, 'romantic', 'Choose two ways you like to be appreciated.', [
    'words|Out loud.',
    'surprise|With a small gesture.',
    'together|With help.',
    'closeness|With time together.',
  ], 'Appreciate each other now.'),
  two('morning', 2, 'romantic', 'Choose two parts of a perfect morning together.', [
    'slow|Staying in bed.',
    'surprise|Breakfast made for me.',
    'touch|Waking up close.',
    'talk|Talking about the day ahead.',
  ], 'This weekend?'),
  two('connection', 4, 'romantic', 'Choose two moments when you feel most connected.', [
    'talk|Late-night talks.',
    'adventure|Travelling together.',
    'play|Laughing at nothing.',
    'together|Getting through something hard.',
  ], 'Tell a story about one.'),
  two('secret-world', 5, 'desires', 'Choose two things you would add to your private world together.', [
    'mystery|More secrets only we know.',
    'words|More honest talk about desire.',
    'surprise|More spontaneity.',
    'play|More games.',
  ], 'Start with one.'),
  two('attractive-moments', 3, 'compliments', 'Choose two moments your partner is most attractive.', [
    'lead|When they are confident.',
    'closeness|When they are caring.',
    'play|When they are being ridiculous.',
    'words|When they are passionate about something.',
  ], 'Tell them which.'),
  two('signals', 3, 'bold', 'Choose two signals you would like to use to say "I want you".', [
    'words|Saying it.',
    'mystery|A particular look.',
    'play|A code word.',
    'touch|A specific touch.',
  ], 'Agree on one.'),
  two('date-ideas', 1, 'dates', 'Select all the date ideas you would happily do this month.', [
    'adventure|A day trip somewhere new.',
    'slow|A long dinner at home.',
    'play|A games or comedy night.',
    'surprise|A mystery date one of us plans.',
  ], 'Pick the first one together.', true),
  two('love-ways', 2, 'romantic', 'Select all the ways you like to receive affection.', [
    'words|Words.',
    'touch|Touch.',
    'together|Acts of care.',
    'closeness|Time together.',
  ], 'Which surprised your partner?', true),
  two('boundaries-help', 4, 'desires', 'Select all the things that help you express a boundary.', [
    'safety|Knowing it will be respected.',
    'talk|A calm moment.',
    'play|A code word.',
    'words|Being asked directly.',
  ], 'Any of these can change over time.', true),
  two('fantasy-settings', 5, 'bold', 'Select all the fantasy settings that appeal to you.', [
    'mystery|A grand old hotel.',
    'adventure|A villa by the sea.',
    'slow|A snowed-in cabin.',
    'play|A city where nobody knows us.',
  ], 'Where do your choices overlap?', true),
  two('evening-kinds', 3, 'romantic', 'Select all the kinds of evening you are in the mood for this week.', [
    'slow|Slow and affectionate.',
    'play|Playful and silly.',
    'talk|Deep and honest.',
    'adventure|Out and spontaneous.',
  ], 'Plan around the overlap.', true),
];
