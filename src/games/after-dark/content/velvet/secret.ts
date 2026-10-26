import { secret } from './types';

/**
 * 7. Secret Curiosities: select privately, then choose to reveal after both
 * answer, reveal now, or keep it private. Private picks are never shown.
 */
export const SECRETS = [
  secret('sc-try', 'Which have you secretly wanted to try with me? Choose up to 2.', [
    'Being tied up.',
    'Tying you up.',
    'A blindfold.',
    'A toy.',
  ]),
  secret('sc-fantasy-type', 'Which fantasy crosses your mind most?', [
    'Strangers.',
    'Being completely in charge.',
    'Completely letting go.',
    'Somewhere we could get caught (but will not).',
  ], 1),
  secret('sc-never-said', 'What have you wanted but never said? Choose up to 2.', [
    'More foreplay.',
    'More intensity.',
    'More talking during.',
    'Something new entirely.',
  ]),
  secret('sc-wear', 'What have you secretly wanted to see me wear?', [
    'Lingerie.',
    'A uniform.',
    'Something leather.',
    'Nothing but heels or boots.',
  ], 1),
  secret('sc-hear', 'What have you secretly wanted me to say in bed? Choose up to 2.', [
    'Praise.',
    'Filthy words.',
    'Orders.',
    'My name, over and over.',
  ]),
  secret('sc-place', 'Where have you imagined us?', [
    'A hotel balcony at night.',
    'A hot tub under the stars.',
    'The kitchen counter.',
    'A sleeper train.',
  ], 1),
  secret('sc-power', 'Which side of power secretly appeals to you?', [
    'Dominant.',
    'Submissive.',
    'Both.',
    'Neither.',
  ], 1),
  secret('sc-roleplay', 'Which roleplay would you secretly pick?', [
    'Strangers at a bar.',
    'Boss and assistant.',
    'Massage therapist and client.',
    'Something I would invent.',
  ], 1),
  secret('sc-sense', 'Which sensation are you most curious about? Choose up to 2.', [
    'Ice and heat.',
    'Feathers and silk.',
    'Being blindfolded.',
    'Massage candle wax.',
  ]),
  secret('sc-bolder', 'Where do you secretly wish you were bolder?', [
    'Starting it.',
    'Saying what I want.',
    'Trying new things.',
    'Being loud.',
  ], 1),
  secret('sc-dream', 'Have you had a steamy dream about me you never mentioned?', [
    'Yes, and I would love to tell you.',
    'Yes, and it stays a secret.',
    'Maybe.',
    'Not yet.',
  ], 1),
  secret('sc-watch', 'How do you secretly feel about being watched by me?', [
    'It turns me on.',
    'Curious.',
    'Shy, but I like it.',
    'Not for me.',
  ], 1),
  secret('sc-word', 'Which word secretly turns you on most?', [
    'Surrender.',
    'Control.',
    'Tease.',
    'Devour.',
  ], 1),
  secret('sc-more-of', 'If you could have more of one thing, secretly, what would it be?', [
    'More often.',
    'Longer.',
    'Wilder.',
    'More variety.',
  ], 1),
  secret('sc-oral', 'How do you secretly feel about oral?', [
    'I want more giving.',
    'I want more receiving.',
    'Both, more.',
    'Happy as it is.',
  ], 1),
  secret('sc-time', 'When do you secretly want me most?', [
    'First thing in the morning.',
    'When you are dressed up.',
    'Mid-argument.',
    'Right after we laugh together.',
  ], 1),
  secret('sc-rough', 'How rough do you secretly want it?', [
    'Gentle.',
    'A little rough.',
    'Rougher than I have admitted.',
    'Depends entirely on the night.',
  ], 1),
  secret('sc-toy', 'Which toy are you most curious about?', [
    'A vibrator for us both.',
    'Something for me.',
    'Something for you.',
    'Dice or a game.',
  ], 1),
  secret('sc-edge', 'Being edged: secretly yes?', [
    'Yes, please.',
    'Curious.',
    'I would rather do it to you.',
    'No.',
  ], 1),
  secret('sc-limit', 'Is there a limit you have never told me?', [
    'Yes, and I want you to know it.',
    'Yes, but not yet.',
    'No.',
    'I am still figuring it out.',
  ], 1),
  secret('sc-first-time', 'Which "first" would you secretly love?', [
    'First time somewhere new.',
    'First time with a toy.',
    'First time tied up.',
    'First time roleplaying.',
  ], 1),
  secret('sc-filthiest', 'How filthy are you, secretly?', [
    'More than you think.',
    'About what you think.',
    'Less than you think.',
    'Depends who is asking.',
  ], 1),
  secret('sc-fantasy-detail', 'If you told me your favourite fantasy, how much detail would you give?', [
    'Every detail.',
    'The outline.',
    'Just a hint.',
    'None. Yet.',
  ], 1),
  secret('sc-sound', 'What sound from me secretly drives you crazy?', [
    'My breathing.',
    'My moans.',
    'My laugh.',
    'My voice saying your name.',
  ], 1),
  secret('sc-lead', 'Secretly, who do you want to make the first move more often?', [
    'Me.',
    'You.',
    'Both.',
    'It is perfect now.',
  ], 1),
  secret('sc-public', 'Secret public teasing: what would you love?', [
    'A hand under the table.',
    'A whisper at a party.',
    'A stolen kiss somewhere we should not.',
    'A look that says everything.',
  ], 1),
  secret('sc-position', 'Which do you secretly want more of?', [
    'Me on top.',
    'You on top.',
    'From behind.',
    'Something new.',
  ], 1),
  secret('sc-afterwards', 'Secretly, what do you crave afterwards?', [
    'To be held.',
    'To go again.',
    'To be told how good it was.',
    'Food and laughter.',
  ], 1),
  secret('sc-curious-list', 'Which are you curious about? Select all that apply.', [
    'Roleplay.',
    'Blindfolds.',
    'Light restraint.',
    'Toys.',
  ], 4),
  secret('sc-tonight', 'Secretly, what do you want tonight?', [
    'You, slowly.',
    'You, urgently.',
    'Something new.',
    'To be surprised.',
  ], 1),
];
