import { pick } from './types';

const scene = (id: string, setup: string, text: string, options: string[]) => pick('theatre', id, text, options, 'scene', { setup });

/** 4. Fantasy Theatre: fictional scenes, four directions, revealed together. */
export const THEATRE = [
  scene('ft-strangers-bar', 'A hotel bar in a city where nobody knows you. You arrived separately. Your partner is sitting three stools away, pretending you have never met, and has not stopped looking at you.', 'What happens next?', [
    'You send a drink over with your room number on the napkin.',
    'You sit beside them and say nothing until they crack.',
    'You let them come to you, and make them work for it.',
    'You leave together within five minutes, without a word.',
  ]),
  scene('ft-elevator', 'Late night. A hotel elevator, mirrored walls, the two of you alone. Twenty floors to go.', 'What do you do with twenty floors?', [
    'Pin them against the mirror and kiss them hard.',
    'Stand perfectly still, not touching, and whisper what happens when the doors open.',
    'Press the stop button.',
    'Slide a hand somewhere you should not, and keep a straight face.',
  ]),
  scene('ft-masquerade', 'A masquerade ball. Velvet masks, candlelit corridors, music drifting through an old mansion. A masked stranger takes your hand and leads you away from the crowd. You know it is your partner.', 'Where do they take you?', [
    'A dark library, door locked behind you.',
    'A balcony, cold air, their body warm against yours.',
    'An empty ballroom, to dance far too close.',
    'Upstairs, without a word.',
  ]),
  scene('ft-massage-therapist', 'A roleplay: one of you is a massage therapist, the other a client who booked the "full evening" treatment. Candles, warm oil, soft music.', 'Which role do you want?', [
    'The therapist, slowly crossing every professional line.',
    'The client, pretending to relax.',
    'Switch halfway.',
    'No roles. Just the massage, then you.',
  ]),
  scene('ft-tease-dinner', 'A fancy restaurant. Under the table, your partner\'s foot slides up your leg. They keep talking to the waiter like nothing is happening.', 'How do you respond?', [
    'Keep a perfectly straight face and tease back.',
    'Lean in and whisper exactly what is going to happen at home.',
    'Ask for the bill. Now.',
    'Excuse yourself and text them to follow you.',
  ]),
  scene('ft-boss-after-hours', 'Fiction only: an office after hours, city lights below. One of you is the demanding boss, the other the assistant who has been staying late on purpose.', 'Who plays the boss?', [
    'Me.',
    'You.',
    'We fight over it.',
    'Neither. Rewrite it as colleagues finally giving in.',
  ]),
  scene('ft-storm', 'The power is out. A storm rattles the windows. One candle, one bed, and nothing to do but each other.', 'How does the night go?', [
    'Slow, by candlelight, all night.',
    'Urgent, like the storm.',
    'A game: every lightning flash, one piece of clothing comes off.',
    'Blindfolded in the dark, all touch.',
  ]),
  scene('ft-pool', 'A private villa. Midnight. The pool lit from below. Your partner slips out of their clothes and into the water, then turns and looks at you.', 'What do you do?', [
    'Follow them in, immediately.',
    'Watch from the edge a little longer.',
    'Pull them out and onto the warm stone.',
    'Make them come and get you.',
  ]),
  scene('ft-photoshoot-free', 'A sunlit studio. White sheets. You agree to a "shoot" with no camera at all. One of you directs, the other poses, slowly losing clothes on command.', 'Which are you?', [
    'The one giving directions.',
    'The one posing.',
    'Both, switching.',
    'The one who breaks the scene and pulls the other in.',
  ]),
  scene('ft-reunion', 'You have been apart for two weeks. They booked a hotel by the airport. The door clicks shut behind you.', 'What happens in the first minute?', [
    'Clothes everywhere. Nobody makes it to the bed.',
    'A long, slow kiss against the door.',
    'They undress you slowly, making you wait even longer.',
    'You push them onto the bed.',
  ]),
  scene('ft-train', 'An overnight sleeper train. A tiny private cabin, the rhythm of the tracks, other passengers just through the wall.', 'How do you play it?', [
    'Quiet. Very, very quiet.',
    'Strangers who just met in the dining car.',
    'Slow and lazy, all night.',
    'You do not care who hears.',
  ]),
  scene('ft-blindfold-tasting', 'You are blindfolded. Your partner feeds you something sweet, then something cold, then kisses you with the taste still on their lips.', 'What do you want next?', [
    'More. Keep going.',
    'Their hands, everywhere.',
    'To be told what is coming.',
    'To take the blindfold and do it to them.',
  ]),
  scene('ft-car', 'A parked car on a private, empty road, windows steaming up, music low.', 'What is the vibe?', [
    'A heavy make-out session, nothing more.',
    'Hands everywhere, clothes half-on.',
    'Climb into the back seat.',
    'Drive home now. Fast.',
  ]),
  scene('ft-power-night', 'Tonight you have agreed one of you is completely in charge. A word has been chosen that stops everything. The rules are set.', 'Which way round?', [
    'I am in charge.',
    'You are in charge.',
    'Switch at midnight.',
    'Flip a coin.',
  ]),
  scene('ft-new-identity', 'For one night you are both someone else: new names, new backstories, meeting for the first time at a party.', 'Who are you?', [
    'Someone dangerously confident.',
    'Someone shy who is secretly very wild.',
    'Someone mysterious who reveals nothing.',
    'Someone who knows exactly what they want and says it.',
  ]),
  scene('ft-tied-scene', 'Silk ties on the bed. A word agreed in advance. Your partner holds one up and raises an eyebrow.', 'Your move?', [
    'Hold out your wrists.',
    'Take it from them and turn the tables.',
    'Use it as a blindfold instead.',
    'Put it away and kiss them.',
  ]),
  scene('ft-cabin', 'A snowed-in cabin. Fire roaring. Nowhere to go for three days and nothing but a bearskin rug and each other.', 'Day one?', [
    'In front of the fire, immediately.',
    'Slowly, on every surface of the cabin.',
    'A bath first, then the fire.',
    'A game with escalating rules.',
  ]),
  scene('ft-wedding', 'A friend\'s wedding. Your partner looks unbelievable. The reception has hours to go.', 'What do you do?', [
    'Find a locked room. Ten minutes.',
    'Dance far too close and torture each other.',
    'Whisper what is happening later, all evening.',
    'Leave early. Say you have a headache.',
  ]),
  scene('ft-instructions', 'You come home to candles and a card: "Follow every instruction. You may stop at any time." The first card says: "Take off one thing. Then come upstairs."', 'What do you hope the next card says?', [
    '"Lie down and close your eyes."',
    '"Undress me."',
    '"Tell me what you want, in detail."',
    '"Get in the bath. I\'m already in it."',
  ]),
  scene('ft-mirror-room', 'A hotel suite with a mirrored wall facing the bed.', 'How do you use it?', [
    'Watch everything.',
    'Make your partner watch.',
    'Turn the lights low so it is just shadows.',
    'Ignore it. Eyes only on each other.',
  ]),
  scene('ft-spa', 'A private spa suite. Warm stone, steam, oils. The attendant leaves and locks the door behind them.', 'Who touches who first?', [
    'You massage me.',
    'I massage you.',
    'At the same time.',
    'Straight into the steam room together.',
  ]),
  scene('ft-tease-day', 'You agree: touching all day is allowed, but nothing more until 9pm. It is 9am.', 'How do you survive the day?', [
    'Torture you with messages.',
    'Barely touch you, then all at once at nine.',
    'Break the rule by lunchtime.',
    'Make you break first.',
  ]),
  scene('ft-artist', 'Washable body paint, a sheet on the floor, music on. You are each other\'s canvas.', 'Where do you start painting?', [
    'Their back.',
    'Their chest.',
    'Their thighs.',
    'You let them paint you first.',
  ]),
  scene('ft-balcony', 'A private hotel balcony at midnight. City lights below. Totally hidden. Your partner comes up behind you and wraps their arms around you.', 'What next?', [
    'Stay out here.',
    'Pull them inside.',
    'Turn around and kiss them against the railing.',
    'Let their hands wander while you watch the city.',
  ]),
  scene('ft-dance-lesson', 'A private evening tango lesson for one, booked by a confident client. The instructor is very hands-on, and the music keeps getting slower.', 'Which role?', [
    'The instructor.',
    'The client.',
    'Swap after one song.',
    'Skip the lesson.',
  ]),
  scene('ft-strip-game', 'A card game. Every lost hand, one piece of clothing comes off. Your partner is very good at cards.', 'Strategy?', [
    'Lose on purpose.',
    'Play to win and enjoy the view.',
    'Cheat.',
    'Abandon the game halfway.',
  ]),
  scene('ft-hot-tub', 'A hot tub under the stars, a bottle of something cold, nobody for miles.', 'How does it end?', [
    'Right there in the water.',
    'Carried inside, dripping.',
    'Wrapped in towels by the fire.',
    'It does not end. We stay all night.',
  ]),
  scene('ft-library', 'A quiet, private library room, booked for the evening. Dark wood, leather chairs, one lamp.', 'What is the fantasy?', [
    'Being quiet when you really cannot be.',
    'Reading something filthy aloud to each other.',
    'Pushed up against the bookshelves.',
    'Taking your time in the big leather chair.',
  ]),
  scene('ft-morning-hotel', 'A lazy hotel morning. Sunlight on white sheets. Breakfast was just delivered. Nobody is getting up.', 'Breakfast or each other?', [
    'Each other. Breakfast can wait.',
    'Breakfast in bed, then each other.',
    'Each other, then breakfast, then each other.',
    'Feed each other, and see where it goes.',
  ]),
  scene('ft-four-doors', 'Four doors, four different nights, each agreed in advance. You only get to open one.', 'Which door?', [
    'Candles, silk and slow music.',
    'A costume and a character waiting for you.',
    'A blindfold and someone else in charge.',
    'Your partner, asking: "What do you want?"',
  ]),
];
