import type { Prompt } from './taxonomy';

const d = (id: string, level: Prompt['level'], category: Prompt['category'], text: string): Prompt => ({ id: `d-${id}`, level, category, text });

/**
 * Dares: small, consensual actions. Every dare works in person or
 * remotely (message, call or voice note). None ask for photos or videos.
 */
export const DARES: Prompt[] = [
  // Level 1
  d('three-compliments', 1, 'compliments', 'Give your partner three specific compliments. No generic ones.'),
  d('pickup-line', 1, 'playful', 'Use your best (or worst) pick-up line on your partner, with full confidence.'),
  d('wink', 1, 'flirty', 'Hold eye contact with your partner for ten seconds without laughing.'),
  d('nickname', 1, 'playful', 'Invent a new, affectionate nickname for your partner and explain it.'),
  d('song', 1, 'romantic', 'Choose a song that fits your partner and explain why.'),
  d('date-pitch', 1, 'dates', 'Pitch your next date idea to your partner in under thirty seconds.'),
  d('impression', 1, 'playful', 'Do an impression of how your partner flirts. Be kind.'),
  d('praise-text', 1, 'compliments', 'Send your partner a message right now about something you love about them.'),
  d('hand', 1, 'romantic', 'Hold your partner’s hand for the next two rounds (or say you are, if apart).'),
  d('laugh', 1, 'playful', 'Make your partner laugh within thirty seconds.'),
  // Level 2
  d('bold-message', 2, 'flirty', 'Send your partner a bold, original message in your own words.'),
  d('recreate', 2, 'romantic', 'Describe a romantic moment you would love to recreate, in detail.'),
  d('slow-dance', 2, 'romantic', 'Slow dance with your partner for one song, or describe exactly how you would.'),
  d('forehead-kiss', 2, 'kissing', 'Give your partner the gentlest kiss you can, wherever they choose on their face.'),
  d('whisper', 2, 'flirty', 'Whisper (or voice-note) something sweet to your partner.'),
  d('date-plan', 2, 'dates', 'Plan a date for this month, right now: where, when and one surprise.'),
  d('admire-out-loud', 2, 'compliments', 'Describe your partner as if you were writing about them in a love letter.'),
  d('shoulder-rub', 2, 'playful', 'Give your partner a shoulder rub for one song, or promise one and set the date.'),
  d('kiss-count', 2, 'kissing', 'Kiss your partner for a slow count of five.'),
  d('love-note', 2, 'romantic', 'Write a two-line love note and read it aloud.'),
  // Level 3
  d('describe-kiss', 3, 'kissing', 'Describe, out loud, how you would like our next kiss to go.'),
  d('confession', 3, 'bold', 'Confess one thing you find irresistible about your partner, in detail.'),
  d('initiative', 3, 'desires', 'Tell your partner one way they could take the initiative that you would love.'),
  d('flirt-two-min', 3, 'flirty', 'Flirt with your partner as if you had just met, for two minutes.'),
  d('voice-note', 3, 'flirty', 'Record a short voice note for your partner to play later tonight.'),
  d('date-night-spec', 3, 'dates', 'Design your ideal intimate date night with three details your partner gets to veto.'),
  d('praise-close', 3, 'compliments', 'Sit close and tell your partner what you noticed about them today.'),
  d('lead-song', 3, 'playful', 'Your partner chooses a song. You lead the slow dance.'),
  d('dare-swap', 3, 'playful', 'Invent a gentle dare for your partner. They can accept or swap it for a truth.'),
  d('three-wants', 3, 'desires', 'Share three romantic things you would like more of, from small to big.'),
  // Level 4
  d('ideal-night', 4, 'desires', 'Describe your ideal intimate date night, start to finish, as far as you are comfortable.'),
  d('kiss-lead', 4, 'kissing', 'Kiss your partner the way you would like to be kissed.'),
  d('tease-sixty', 4, 'flirty', 'Tease your partner for sixty seconds without touching them.'),
  d('blindfold-taste', 4, 'playful', 'With their consent, give your partner something to taste with their eyes closed and let them guess.'),
  d('massage', 4, 'playful', 'Give your partner a hand or shoulder massage for two songs.'),
  d('bold-plan', 4, 'dates', 'Plan a night that is just for the two of you this week, and put it in the calendar now.'),
  d('compliment-close', 4, 'compliments', 'Hold your partner close and tell them three things that make you want them.'),
  d('secret-word', 4, 'bold', 'Agree on a secret word for "I want you" that you can use in public.'),
  d('wish', 4, 'desires', 'Tell your partner one wish for tonight. They can say yes, not tonight, or offer an alternative.'),
  d('kiss-neck', 4, 'kissing', 'Ask your partner where they would like a kiss, and give them exactly that.'),
];
