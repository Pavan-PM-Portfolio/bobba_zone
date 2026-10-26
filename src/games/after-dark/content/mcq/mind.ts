import { mcq, type McqLevel } from './types';
import type { Category } from '../taxonomy';

function mind(id: string, level: McqLevel, category: Category, text: string, them: string, options: string[], followUp: string) {
  return mcq(`m-${id}`, 'mind', level, category, text, options, followUp, { them });
}

/**
 * Read My Mind: one partner answers about themselves, the other predicts.
 * `them` is shown to the predictor; {name} is replaced with the answerer's name.
 */
export const MIND = [
  mind('appreciated', 1, 'romantic', 'What makes you feel most appreciated?', 'What makes {name} feel most appreciated?', [
    'words|Being thanked out loud, specifically.',
    'together|Help with something without having to ask.',
    'surprise|A small gift that shows thought.',
    'closeness|Undivided attention.',
  ], 'Ask what made this option appealing.'),
  mind('surprise-gesture', 1, 'romantic', 'Which romantic gesture would surprise you most?', 'Which romantic gesture would surprise {name} most?', [
    'words|A handwritten letter.',
    'adventure|A spontaneous trip.',
    'slow|A whole day planned around me.',
    'play|A ridiculous public declaration.',
  ], 'Which one would you actually love?'),
  mind('open-up', 4, 'desires', 'What helps you open up when something is difficult to discuss?', 'What helps {name} open up when something is difficult to discuss?', [
    'slow|Time and no pressure.',
    'touch|Being close, side by side.',
    'mystery|Talking in the dark or on a walk.',
    'safety|Knowing the reaction will be kind.',
  ], 'Explain your choice, without pressure.'),
  mind('remember-date', 1, 'dates', 'Which kind of date would you remember longest?', 'Which kind of date would {name} remember longest?', [
    'adventure|Somewhere completely new.',
    'slow|A long, quiet dinner.',
    'play|Something silly and active.',
    'surprise|One I knew nothing about until it began.',
  ], 'Plan it.'),
  mind('connected', 2, 'romantic', 'What kind of attention makes you feel most connected?', 'What kind of attention makes {name} feel most connected?', [
    'talk|Deep conversation.',
    'touch|Affectionate touch.',
    'play|Laughing together.',
    'closeness|Simply being near each other.',
  ], 'When did you last feel this?'),
  mind('boundary', 4, 'desires', 'What helps you communicate a boundary comfortably?', 'What helps {name} communicate a boundary comfortably?', [
    'safety|Knowing it will not be taken personally.',
    'talk|A calm moment, away from the situation.',
    'play|A code word or signal.',
    'words|Being asked directly.',
  ], 'Is there anything that would make it even easier?'),
  mind('compliment', 1, 'compliments', 'Which compliment would mean the most to you?', 'Which compliment would mean the most to {name}?', [
    'words|One about how I look.',
    'closeness|One about who I am.',
    'lead|One about something I achieved.',
    'play|One about how I make them laugh.',
  ], 'Give it now.'),
  mind('mood', 2, 'flirty', 'What is the quickest way to put you in a romantic mood?', 'What is the quickest way to put {name} in a romantic mood?', [
    'words|Telling me what they love about me.',
    'slow|Unhurried time with no distractions.',
    'touch|A long hug or a kiss.',
    'surprise|An unexpected gesture.',
  ], 'Was the guess close?'),
  mind('stress', 4, 'romantic', 'When you are stressed, what do you most want from your partner?', 'When {name} is stressed, what do they most want from their partner?', [
    'space|Some space.',
    'touch|To be held.',
    'together|Practical help.',
    'talk|To talk it through.',
  ], 'Does this change depending on the kind of stress?'),
  mind('kiss', 2, 'kissing', 'Which kind of kiss do you love most?', 'Which kind of kiss does {name} love most?', [
    'slow|Slow and lingering.',
    'surprise|Unexpected.',
    'play|Playful.',
    'lead|Confident.',
  ], 'Show them.'),
  mind('initiative', 3, 'bold', 'How do you most like romance to be initiated?', 'How does {name} most like romance to be initiated?', [
    'words|With words.',
    'mystery|With a look.',
    'touch|With touch.',
    'plan|With a plan.',
  ], 'How do you usually initiate?'),
  mind('date-night', 1, 'dates', 'Your ideal date night is...', '{name}\'s ideal date night is...', [
    'slow|At home with good food and no phones.',
    'adventure|Out somewhere new.',
    'play|A games night with stakes.',
    'surprise|Whatever my partner plans in secret.',
  ], 'When is the next one?'),
  mind('wanted', 3, 'desires', 'What makes you feel most wanted?', 'What makes {name} feel most wanted?', [
    'words|Being told directly.',
    'play|Playful flirting.',
    'touch|Affection without reason.',
    'lead|My partner taking initiative.',
  ], 'What could happen more often?'),
  mind('apology', 4, 'romantic', 'Which kind of apology means the most to you?', 'Which kind of apology means the most to {name}?', [
    'words|A clear, specific "I\'m sorry".',
    'together|A change in behaviour.',
    'touch|Closeness after the words.',
    'talk|Understanding what went wrong.',
  ], 'Is there one you are still waiting for?'),
  mind('fantasy-trip', 2, 'dates', 'Where would you most like a romantic getaway?', 'Where would {name} most like a romantic getaway?', [
    'slow|A quiet cabin.',
    'adventure|A buzzing new city.',
    'closeness|A beach with nobody else.',
    'mystery|Anywhere, as long as it is a surprise.',
  ], 'Start saving for it.'),
  mind('tease', 3, 'playful', 'What kind of teasing do you secretly enjoy?', 'What kind of teasing does {name} secretly enjoy?', [
    'words|Being told what is coming later.',
    'mystery|Being kept guessing.',
    'play|Being challenged.',
    'touch|Being almost kissed.',
  ], 'Was it a surprise?'),
  mind('love-language', 1, 'romantic', 'Which is closest to how you like to receive love?', 'Which is closest to how {name} likes to receive love?', [
    'words|Words.',
    'touch|Touch.',
    'together|Acts of care.',
    'closeness|Time together.',
  ], 'How would you give it to them this week?'),
  mind('secret-wish', 3, 'desires', 'Which would you secretly like more of?', 'Which would {name} secretly like more of?', [
    'surprise|Spontaneity.',
    'slow|Slow, unhurried time.',
    'words|Being told I am desired.',
    'adventure|New experiences.',
  ], 'Was the guess right?'),
  mind('relax', 2, 'romantic', 'What helps you relax completely with your partner?', 'What helps {name} relax completely with their partner?', [
    'play|Laughing together.',
    'touch|Being close.',
    'slow|No plans at all.',
    'talk|Talking about nothing.',
  ], 'Plan an evening around it.'),
  mind('jealous', 3, 'flirty', 'How do you like to be reassured when you feel a little jealous?', 'How does {name} like to be reassured when they feel a little jealous?', [
    'words|Being told plainly.',
    'closeness|Being included.',
    'touch|Affection in public.',
    'space|I prefer to sort it out myself.',
  ], 'Explain, if you like.'),
  mind('morning', 1, 'romantic', 'What is your favourite way to start a morning together?', 'What is {name}\'s favourite way to start a morning together?', [
    'slow|Staying in bed.',
    'surprise|Breakfast made for me.',
    'together|Cooking together.',
    'adventure|Heading out early somewhere.',
  ], 'Tomorrow?'),
  mind('dynamic', 3, 'bold', 'In romance, which dynamic do you enjoy most?', 'In romance, which dynamic does {name} enjoy most?', [
    'lead|Leading.',
    'follow|Being led.',
    'play|Taking turns.',
    'together|Equal footing.',
  ], 'Does it change with mood?'),
  mind('miss', 2, 'romantic', 'When you are apart, what do you miss most?', 'When you are apart, what does {name} miss most?', [
    'touch|Their touch.',
    'words|Their voice.',
    'play|Their humour.',
    'closeness|Their presence in the room.',
  ], 'Tell them when you are next apart.'),
  mind('new-thing', 4, 'desires', 'What would make you comfortable trying something new together?', 'What would make {name} comfortable trying something new together?', [
    'talk|Talking about it first.',
    'slow|Starting small.',
    'safety|Knowing we can stop any time.',
    'space|Time to think separately.',
  ], 'Curiosity is not consent. How do you like to be asked?'),
  mind('reconnect', 4, 'romantic', 'After a busy week apart, what reconnects you fastest?', 'After a busy week, what reconnects {name} fastest?', [
    'touch|A long hug.',
    'talk|A proper catch-up.',
    'slow|A lazy day together.',
    'surprise|A date night.',
  ], 'Make it a ritual.'),
  mind('hottest-quality', 3, 'compliments', 'Which of your partner\'s qualities do you find most attractive?', 'Which of your qualities does {name} find most attractive?', [
    'lead|Confidence.',
    'closeness|Kindness.',
    'play|Humour.',
    'words|Intelligence.',
  ], 'Hear it from them directly.'),
  mind('song', 2, 'romantic', 'Which kind of song makes you think of your partner?', 'Which kind of song makes {name} think of you?', [
    'slow|A slow love song.',
    'play|A ridiculous pop song.',
    'closeness|Our song.',
    'mystery|Something nobody would guess.',
  ], 'Name it.'),
  mind('gift', 1, 'romantic', 'Which gift would you love most?', 'Which gift would {name} love most?', [
    'surprise|A surprise experience.',
    'words|Something handwritten.',
    'together|Something we use together.',
    'closeness|Something they noticed I wanted months ago.',
  ], 'Make a note.'),
  mind('fantasy-setting', 5, 'desires', 'Which setting appeals to you most for a romantic fantasy?', 'Which setting appeals to {name} most for a romantic fantasy?', [
    'mystery|A grand old hotel.',
    'adventure|A villa by the sea.',
    'slow|A cabin in the snow.',
    'play|A city where nobody knows us.',
  ], 'Describe the opening scene.'),
  mind('say-more', 5, 'desires', 'Which would you like your partner to say more often?', 'Which would {name} like to hear more often?', [
    'words|"You look incredible."',
    'closeness|"I love you."',
    'lead|"Come here."',
    'mystery|"I have a plan for tonight."',
  ], 'Say it.'),
];
