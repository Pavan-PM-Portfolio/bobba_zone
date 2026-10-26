import { atlas } from './types';

/**
 * 5. Kink & Fetish Atlas. Each card: Definitely interested / Curious /
 * Interested only after discussion / Not interested / Keep private.
 * Searchable by group and tags. Interest is never agreement.
 */
export const ATLAS = [
  // Roleplay & costumes
  atlas('ka-strangers', 'Roleplay & costumes', 'Strangers meeting', 'Arrive separately, meet as strangers, go home together.', ['roleplay', 'strangers', 'bar', 'hotel'], 4),
  atlas('ka-boss', 'Roleplay & costumes', 'Boss and assistant', 'A power-tinged office fantasy, played purely as fiction.', ['roleplay', 'office', 'power']),
  atlas('ka-uniform', 'Roleplay & costumes', 'Uniforms', 'Pilot, officer, nurse, chef. Whatever does it for you.', ['costume', 'uniform', 'roleplay']),
  atlas('ka-characters', 'Roleplay & costumes', 'Playing characters', 'A whole storyline with names and backstories.', ['roleplay', 'characters', 'story'], 4),
  atlas('ka-costume', 'Roleplay & costumes', 'Dressing up', 'A costume chosen by your partner, worn just for them.', ['costume', 'dress up'], 4),

  // Sensory play
  atlas('ka-ice', 'Sensory play', 'Ice and heat', 'An ice cube traced across skin, then warm breath.', ['sensory', 'temperature', 'ice'], 4),
  atlas('ka-feather', 'Sensory play', 'Feathers and silk', 'Barely-there touches that make skin come alive.', ['sensory', 'feather', 'silk', 'tease'], 4),
  atlas('ka-wax', 'Sensory play', 'Massage candle wax', 'Body-safe massage candles melted into warm oil on your skin.', ['sensory', 'wax', 'warm', 'massage']),
  atlas('ka-food', 'Sensory play', 'Food play', 'Strawberries, chocolate, cream, eaten off each other.', ['sensory', 'food', 'taste'], 4),
  atlas('ka-sounds', 'Sensory play', 'Headphones and sound', 'Music in your ears while your partner does whatever they like.', ['sensory', 'sound', 'music']),

  // Blindfolds & agreed sensory restriction
  atlas('ka-blindfold-me', 'Blindfolds & restriction', 'Being blindfolded', 'Every touch becomes a surprise.', ['blindfold', 'sensory', 'surprise'], 4),
  atlas('ka-blindfold-them', 'Blindfolds & restriction', 'Blindfolding your partner', 'They cannot see what you will do next.', ['blindfold', 'control']),
  atlas('ka-earplugs', 'Blindfolds & restriction', 'No sight, no sound', 'Blindfold and earplugs. Touch is the only sense left.', ['blindfold', 'sensory', 'deprivation']),
  atlas('ka-dont-move', 'Blindfolds & restriction', '"Don\'t move" games', 'Told to stay perfectly still, whatever happens.', ['stillness', 'control', 'tease']),
  atlas('ka-no-hands', 'Blindfolds & restriction', 'No hands allowed', 'One of you is not allowed to use their hands. At all.', ['hands', 'rules', 'tease'], 4),

  // Restraint-related curiosity
  atlas('ka-silk-ties', 'Restraint', 'Silk ties', 'Wrists loosely tied with silk. Easy to slip, with a stop word.', ['restraint', 'silk', 'tied']),
  atlas('ka-cuffs', 'Restraint', 'Soft cuffs', 'Padded cuffs with a quick release.', ['restraint', 'cuffs']),
  atlas('ka-held-down', 'Restraint', 'Being held down', 'Wrists pinned by your partner\'s hands, no props at all.', ['restraint', 'hands', 'pinned']),
  atlas('ka-tie-them', 'Restraint', 'Tying your partner up', 'You do the tying, they are at your mercy.', ['restraint', 'control']),
  atlas('ka-rope', 'Restraint', 'Decorative rope', 'Learning a simple, safe rope pattern together.', ['restraint', 'rope', 'shibari']),

  // Consensual power dynamics
  atlas('ka-dominant', 'Power dynamics', 'Being dominant', 'Taking full control, within everything you both agreed.', ['dominant', 'power', 'control']),
  atlas('ka-submissive', 'Power dynamics', 'Being submissive', 'Handing over control, knowing you can stop it any time.', ['submissive', 'power', 'surrender']),
  atlas('ka-orders', 'Power dynamics', 'Following orders', 'Being told exactly what to do, and doing it.', ['orders', 'instructions', 'submissive']),
  atlas('ka-permission', 'Power dynamics', 'Asking permission', 'Not allowed to finish until you are told you may.', ['permission', 'control', 'edging']),
  atlas('ka-titles', 'Power dynamics', 'Special titles', 'Names you only use in the bedroom.', ['titles', 'names', 'power']),

  // Praise & verbal preferences
  atlas('ka-praise', 'Praise & words', 'Praise', 'Being told how good you are, how beautiful, how perfect.', ['praise', 'words', 'compliments'], 4),
  atlas('ka-dirty-talk', 'Praise & words', 'Dirty talk', 'Saying exactly what you want, in the boldest words you have.', ['dirty talk', 'words', 'filthy']),
  atlas('ka-narrate', 'Praise & words', 'Narrating', 'Your partner describes everything they are doing as they do it.', ['words', 'narrate', 'voice']),
  atlas('ka-beg', 'Praise & words', 'Begging', 'Being made to ask, nicely, for what you want.', ['beg', 'words', 'tease']),
  atlas('ka-phone', 'Praise & words', 'Phone sex', 'Voices only, when you are apart.', ['phone', 'voice', 'distance'], 4),

  // Teasing & anticipation
  atlas('ka-tease-denial', 'Teasing & anticipation', 'Tease and denial', 'Brought close, then made to wait. Again and again.', ['tease', 'denial', 'edging']),
  atlas('ka-all-day', 'Teasing & anticipation', 'All-day build-up', 'Messages, looks and touches all day, nothing until tonight.', ['tease', 'anticipation', 'messages'], 4),
  atlas('ka-countdown', 'Teasing & anticipation', 'A countdown', 'A date set a week ahead, with a hint every day.', ['anticipation', 'countdown', 'planning'], 4),
  atlas('ka-public-tease', 'Teasing & anticipation', 'Secret public teasing', 'A hand under the table, a whisper at a party. Nobody knows.', ['tease', 'public', 'secret']),
  atlas('ka-slow', 'Teasing & anticipation', 'Agonisingly slow', 'A whole night where nothing is allowed to be rushed.', ['slow', 'tease', 'anticipation'], 4),

  // Clothing & presentation
  atlas('ka-lingerie', 'Clothing & presentation', 'Lingerie', 'Something lacy, worn to be seen and taken off.', ['lingerie', 'lace', 'clothing'], 4),
  atlas('ka-heels', 'Clothing & presentation', 'Heels or boots in bed', 'Everything off except the shoes.', ['heels', 'boots', 'clothing']),
  atlas('ka-his-shirt', 'Clothing & presentation', 'Wearing their shirt', 'Their shirt, and absolutely nothing else.', ['shirt', 'clothing'], 4),
  atlas('ka-leather-lace', 'Clothing & presentation', 'Leather or latex', 'Something tight, shiny and a little dangerous.', ['leather', 'latex', 'fetish']),
  atlas('ka-choose-outfit', 'Clothing & presentation', 'Choosing their outfit', 'You pick exactly what they wear tonight.', ['outfit', 'control', 'clothing'], 4),

  // Novelty & imaginative scenarios
  atlas('ka-new-place', 'Novelty & scenarios', 'Somewhere new', 'A new room, a hotel, a cabin. Same us, new place.', ['location', 'novelty', 'hotel'], 4),
  atlas('ka-dice', 'Novelty & scenarios', 'Sex dice and games', 'Let the dice decide what happens next.', ['dice', 'game', 'novelty'], 4),
  atlas('ka-erotica', 'Novelty & scenarios', 'Acting out a story', 'Reading an erotic story, then acting it out.', ['story', 'erotica', 'roleplay']),
  atlas('ka-watching', 'Novelty & scenarios', 'Watching each other', 'Taking turns being touched while the other just watches.', ['watching', 'voyeur', 'tease']),
  atlas('ka-toys-new', 'Novelty & scenarios', 'A new toy', 'Choosing something new together and trying it that night.', ['toys', 'novelty', 'vibrator']),

  // Leading & switching
  atlas('ka-take-lead', 'Leading & switching', 'You take the lead', 'You decide everything tonight.', ['lead', 'initiate', 'control'], 4),
  atlas('ka-be-led', 'Leading & switching', 'Being led', 'Your partner decides everything tonight.', ['led', 'follow', 'surrender'], 4),
  atlas('ka-switch', 'Leading & switching', 'Switching mid-way', 'Start in charge, end at their mercy.', ['switch', 'power']),
  atlas('ka-wrestle', 'Leading & switching', 'Playful wrestling for control', 'Whoever ends up on top decides.', ['wrestle', 'playful', 'power']),
  atlas('ka-coin', 'Leading & switching', 'Leave it to chance', 'A coin toss decides who is in charge.', ['chance', 'game', 'switch'], 4),
];

export const ATLAS_GROUPS = [...new Set(ATLAS.map((a) => a.group!))];
