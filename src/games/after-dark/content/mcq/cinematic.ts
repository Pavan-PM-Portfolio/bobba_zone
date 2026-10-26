import { mcq, type McqLevel } from './types';
import type { Category } from '../taxonomy';

type Beat = [setting: string, atmosphere: string, situation: string];

function scene(id: string, level: McqLevel, category: Category, [setting, atmosphere, situation]: Beat, question: string, options: string[], followUp: string) {
  return mcq(`c-${id}`, 'cinematic', level, category, question, options, followUp, { scene: { setting, atmosphere, situation } });
}

/** The Cinematic Choice: longer scenes told in three beats, then a decision. */
export const CINEMATIC = [
  scene('rainy-evening', 1, 'romantic', [
    'Your living room, on a rainy evening after a long day.',
    'Rain against the windows, music low in the background, no fixed plan.',
    'Your partner looks up and asks what you feel like doing tonight.',
  ], 'Which response sounds most appealing?', [
    'closeness|Sit close, talk about the day and enjoy a slow, affectionate evening.',
    'play|Turn the evening into a game of teasing questions and playful challenges.',
    'talk|Share a personal thought or desire you have been wanting to discuss.',
    'follow|Let your partner surprise you with a plan, free to change it together.',
  ], 'What detail would make this moment feel especially meaningful to you?'),
  scene('bookshop', 1, 'flirty', [
    'A tiny second-hand bookshop on a quiet Sunday.',
    'Dust in the sunlight, creaking floors, the smell of old paper.',
    'Your partner hands you a book with a note tucked inside: "Page 47."',
  ], 'What do you hope is on page 47?', [
    'words|A line they underlined because it reminded them of you.',
    'mystery|A second note sending you to another shelf.',
    'play|A ridiculous doodle of the two of you.',
    'surprise|Two tickets to something tonight.',
  ], 'What would you hide in a book for them?'),
  scene('market', 1, 'dates', [
    'A busy night market in a city you are visiting.',
    'Lanterns overhead, sizzling food stalls, music from every direction.',
    'You lose each other in the crowd for a moment, then spot them through the lights, grinning.',
  ], 'What do you do next?', [
    'play|Hide and make them find you.',
    'closeness|Push through and take their hand, and do not let go.',
    'surprise|Buy them something small before they reach you.',
    'adventure|Wave them over and pull them down an alley you have not explored.',
  ], 'Where in the world should this market be?'),
  scene('picnic', 1, 'romantic', [
    'A hillside above the city, late afternoon.',
    'Golden light, a blanket, a basket your partner packed without telling you what is in it.',
    'They hand you the basket and say, "You choose what we open first."',
  ], 'What are you hoping to find?', [
    'slow|Something to share slowly while the sun goes down.',
    'surprise|Something that proves they planned this for weeks.',
    'play|Something ridiculous, like birthday candles for no reason.',
    'words|A letter at the bottom.',
  ], 'What would you pack for them?'),
  scene('first-date-redo', 1, 'flirty', [
    'The place you had your first date.',
    'It looks almost the same; you both feel a little different.',
    'Your partner says, "Let\'s do it again, but this time say what you were really thinking."',
  ], 'What would you admit first?', [
    'words|What I noticed first about them.',
    'play|The thing I was nervous about all night.',
    'closeness|The moment I knew I wanted to see them again.',
    'mystery|Something I have never told them about that night.',
  ], 'Tell them now.'),
  scene('ferris-wheel', 1, 'kissing', [
    'A Ferris wheel at a seaside fair.',
    'Your carriage stops at the very top. The city lights are spread below.',
    'It is quiet up here, and the wheel shows no sign of moving.',
  ], 'What do you do with the moment?', [
    'slow|Just look at the view together, saying nothing.',
    'closeness|Kiss until the wheel starts moving again.',
    'talk|Say something you would not say on the ground.',
    'play|Rock the carriage and make them scream.',
  ], 'What would you say up there?'),

  scene('jazz-bar', 2, 'flirty', [
    'A dim basement jazz bar.',
    'Candlelight on small tables, a saxophone that seems to know your mood.',
    'Your partner leans across and says, "Pretend we just met. Go."',
  ], 'How do you open?', [
    'lead|A confident line and a drink offered.',
    'mystery|Say very little and let them work for it.',
    'play|The worst pick-up line I know.',
    'words|A sincere compliment, as if seeing them for the first time.',
  ], 'Who would win them over faster?'),
  scene('storm-cabin', 2, 'romantic', [
    'A small cabin in the mountains.',
    'A storm outside, a fire crackling, the lights flickering.',
    'The power goes out completely. Your partner lights a single candle and sits beside you.',
  ], 'What happens in the next hour?', [
    'talk|We talk honestly by candlelight.',
    'touch|We curl up under every blanket in the cabin.',
    'play|We tell ghost stories and scare each other.',
    'slow|We let the quiet do the talking.',
  ], 'What would make this perfect?'),
  scene('balcony-dance', 2, 'romantic', [
    'A hotel balcony on the last night of a holiday.',
    'Warm air, distant music drifting up from a wedding below.',
    'Your partner holds out a hand without a word.',
  ], 'How does it play out?', [
    'slow|A slow dance, foreheads together.',
    'play|A dramatic, ridiculous dance that ends in laughter.',
    'words|They whisper something while we sway.',
    'surprise|We sneak down and join the wedding.',
  ], 'Which song is playing?'),
  scene('train', 2, 'flirty', [
    'An overnight train crossing the countryside.',
    'Your own small cabin, rain streaking the window, the rhythm of the tracks.',
    'Your partner says, "We have ten hours and nowhere to be."',
  ], 'How do you spend them?', [
    'talk|Talking all night as the landscape passes.',
    'touch|Squeezed into one narrow bunk.',
    'play|Card games with increasingly silly stakes.',
    'slow|Watching the window and dozing together.',
  ], 'Where would the train arrive?'),
  scene('beach-midnight', 2, 'kissing', [
    'An empty beach at midnight.',
    'A full moon on the water, shoes in your hands, the sand still warm.',
    'Your partner stops walking and turns to face you.',
  ], 'What do you want to happen?', [
    'closeness|A long kiss with the waves around our feet.',
    'play|They run into the sea and dare you to follow.',
    'words|They tell you something they have been saving.',
    'slow|You lie back and count stars together.',
  ], 'Tell your partner which.'),
  scene('kitchen-dance', 2, 'romantic', [
    'Your kitchen on an ordinary weeknight.',
    'Dinner simmering, a song you both love comes on the radio.',
    'Your partner puts down the spoon and pulls you away from the stove.',
  ], 'What do you do?', [
    'slow|Sway with them while dinner nearly burns.',
    'play|Sing loudly and badly.',
    'touch|Hold on long after the song ends.',
    'lead|Spin them around and take the lead.',
  ], 'What makes ordinary moments romantic for you?'),

  scene('masquerade', 3, 'bold', [
    'A masquerade ball in an old mansion.',
    'Velvet masks, a string quartet, chandeliers that turn everything gold.',
    'Someone slips a note into your hand: "Library. Ten minutes." It is your partner\'s handwriting.',
  ], 'What do you do?', [
    'mystery|Arrive late, to make them wonder.',
    'lead|Arrive early and be waiting for them.',
    'play|Send a decoy in a similar mask.',
    'words|Write a note back with conditions.',
  ], 'What would happen in the library?'),
  scene('road-trip', 3, 'dates', [
    'A long empty road at dusk.',
    'Windows down, a playlist you made together, no destination set.',
    'Your partner says, "Next turn, you choose. Every turn after that, I choose."',
  ], 'Where do you take the first turn?', [
    'adventure|Towards the mountains, as far as possible.',
    'slow|Towards the coast, to watch the sun go down.',
    'mystery|Down a road with no signpost.',
    'surprise|Back towards a place that matters to us.',
  ], 'Where would they take you next?'),
  scene('rooftop-pool', 3, 'bold', [
    'A rooftop pool long after closing time.',
    'City lights below, the water glowing, nobody else around.',
    'Your partner is already at the edge, daring you with a look.',
  ], 'What is your move?', [
    'adventure|Jump in, clothes and all.',
    'slow|Sit at the edge and talk with our feet in the water.',
    'play|Push them in first.',
    'safety|Laugh and suggest we come back properly another night.',
  ], 'What makes a small risk feel exciting rather than stressful?'),
  scene('gallery', 3, 'flirty', [
    'A late-night opening at an art gallery.',
    'White walls, low conversation, a painting that stops you both.',
    'Your partner leans in and says, "Tell me what you see in it. Honestly."',
  ], 'What do you say?', [
    'words|Something that reminds me of them.',
    'mystery|Something I would never usually admit.',
    'play|Something completely made up to make them laugh.',
    'talk|What it makes me feel about us.',
  ], 'Would you go to a gallery date together?'),
  scene('hotel-letter', 3, 'bold', [
    'A hotel room on a weekend away.',
    'Fresh sheets, a city outside the window, the evening ahead of you.',
    'On the pillow, an envelope: "Open only if you want to know what tonight is about."',
  ], 'Do you open it?', [
    'adventure|Immediately.',
    'mystery|Not yet. I want to make them wait.',
    'talk|Only together.',
    'surprise|I leave one of my own next to it first.',
  ], 'What would your envelope say?'),
  scene('festival', 3, 'playful', [
    'A summer music festival.',
    'Thousands of people, coloured lights, the bass in your chest.',
    'Your partner slips their arms around you from behind and says, "Escape with me."',
  ], 'Where do you go?', [
    'adventure|To the front of the biggest stage.',
    'slow|To the quietest field, to lie in the grass.',
    'play|To the ridiculous silent disco.',
    'closeness|Back to the tent, just the two of us.',
  ], 'Which festival would you choose?'),

  scene('unsaid', 4, 'desires', [
    'Your bedroom, very late at night.',
    'Lights off, only streetlight through the curtains. Neither of you can sleep.',
    'Your partner whispers, "Is there something you have wanted to tell me, but never found the moment?"',
  ], 'How do you respond?', [
    'words|Tell them, right there in the dark.',
    'safety|Ask them to promise they will not react straight away.',
    'space|Say yes, and ask to tell them tomorrow.',
    'talk|Ask them to go first.',
  ], 'What helps a hard conversation feel safe?'),
  scene('old-letters', 4, 'romantic', [
    'A rainy afternoon, clearing out a cupboard.',
    'You find a box of old letters and ticket stubs from your early days together.',
    'Your partner sits beside you and reads one aloud.',
  ], 'How do you feel?', [
    'closeness|Overwhelmed by how far we have come.',
    'play|Embarrassed and laughing.',
    'talk|Curious about what has changed in us.',
    'words|Moved to write a new one.',
  ], 'What would you want to remember from this year?'),
  scene('hospital-corridor', 4, 'romantic', [
    'A quiet corridor after receiving difficult news about someone you love.',
    'Bright lights, a vending machine humming, a long night ahead.',
    'Your partner sits beside you without saying anything.',
  ], 'What do you need from them?', [
    'touch|Just their hand in mine.',
    'words|Something reassuring, even if it is not certain.',
    'space|Silence, and for them to stay.',
    'together|Help with what needs doing next.',
  ], 'How can you show up for each other in hard times?'),
  scene('car-park', 4, 'desires', [
    'A car parked outside your home after an argument.',
    'Engine off, rain on the windscreen, neither of you ready to go inside.',
    'Your partner says, "I don\'t want to go in until we\'re okay."',
  ], 'What would help most?', [
    'talk|Saying everything, right here.',
    'touch|A hug first, then talking.',
    'words|An apology from both of us.',
    'space|Going in and talking tomorrow, with a promise we will.',
  ], 'How do you usually make up?'),
  scene('anniversary', 4, 'romantic', [
    'Your anniversary dinner, at the table in the corner.',
    'Candles, the restaurant noise fading into the background.',
    'Your partner asks, "What do you want the next year of us to feel like?"',
  ], 'Which word fits your answer?', [
    'adventure|Adventurous.',
    'slow|Unhurried.',
    'closeness|Closer.',
    'play|Lighter.',
  ], 'What would make it happen?'),
  scene('morning-honesty', 4, 'desires', [
    'A slow Sunday morning in bed.',
    'Coffee going cold, sunlight on the sheets, nowhere to be.',
    'Your partner says, "Tell me one thing you want more of between us."',
  ], 'What would you say?', [
    'touch|More affection without a reason.',
    'talk|More talks like this one.',
    'surprise|More spontaneity.',
    'words|More saying what we want.',
  ], 'And what would they say?'),

  scene('villa', 5, 'bold', [
    'A private villa on a cliff above the sea.',
    'Warm night air, a pool lit from below, the sound of waves far down.',
    'Your partner says, "Tonight we only do what we have never done before. Your call first."',
  ], 'What do you choose?', [
    'adventure|Something daring we have both talked about.',
    'mystery|Something I have imagined but never said.',
    'play|A game with rules we invent together.',
    'safety|A slower version of something new, with a check-in.',
  ], 'Any new thing should be agreed by both of you. What would you add to the list?'),
  scene('secret-room', 5, 'bold', [
    'An old hotel with a famous locked room.',
    'Dark wood, low light, a rumour that every couple leaves with a secret.',
    'The concierge hands your partner the key. They hand it to you.',
  ], 'Who goes in first?', [
    'lead|I do, and I set the scene.',
    'follow|They do, and I follow.',
    'together|We go in together.',
    'mystery|Neither. We keep the key and imagine.',
  ], 'What secret would you leave with?'),
  scene('night-swim', 5, 'romantic', [
    'A secluded lake on a summer night.',
    'Fireflies, warm water, nobody for miles.',
    'Your partner steps into the water and turns back, waiting for you.',
  ], 'What do you do?', [
    'adventure|Follow them straight in.',
    'slow|Wade in slowly, savouring it.',
    'play|Splash them and run.',
    'words|Watch from the shore a moment and tell them what I see.',
  ], 'Which detail stays with you?'),
  scene('two-strangers', 5, 'playful', [
    'A hotel bar in a city where nobody knows you.',
    'Low lights, a pianist, the clink of glasses.',
    'You have agreed to arrive separately and act as strangers. Your partner sits down two seats away.',
  ], 'What do you do?', [
    'lead|Move closer and introduce myself under a new name.',
    'mystery|Wait for them to make the first move.',
    'play|Send a drink over with a ridiculous note.',
    'words|Ask the bartender to pass on a message.',
  ], 'Remember, it is a game you can stop at any time. What name would you use?'),
  scene('snowed-in', 5, 'desires', [
    'A chalet, snowed in for the weekend.',
    'Fire, blankets, a bottle of something good, no signal.',
    'Your partner says, "No phones, no plans. Let\'s tell each other one secret wish each night."',
  ], 'What kind of wish would you share on the first night?', [
    'words|Something I want us to do together.',
    'mystery|Something I have imagined about us.',
    'closeness|Something I need from them.',
    'play|Something light, to warm up.',
  ], 'What would you save for the last night?'),
  scene('instructions', 5, 'bold', [
    'Your home, a Friday evening.',
    'You arrive to candles and a note: "Follow the instructions. You can stop at any point."',
    'The first card says: "Choose how tonight begins."',
  ], 'Which do you choose?', [
    'slow|A long bath, with them reading to you.',
    'play|A treasure hunt through the house.',
    'words|A letter they wrote about tonight.',
    'touch|Being led by the hand to the next room.',
  ], 'What would your instructions say for them?'),
];
