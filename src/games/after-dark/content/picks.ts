import type { Category, Level } from './taxonomy';

export interface Pick {
  id: string;
  pack: PackId;
  level: Level;
  category: Category;
  a: string;
  b: string;
}
export type PackId = 'flirting' | 'romance' | 'affection' | 'chemistry' | 'preferences' | 'future';

export const PACKS: { id: PackId; title: string; detail: string }[] = [
  { id: 'flirting', title: 'Flirting', detail: 'Banter, teasing and first moves' },
  { id: 'romance', title: 'Romance', detail: 'Dates, gestures and grand moments' },
  { id: 'affection', title: 'Affection', detail: 'Touch, closeness and kisses' },
  { id: 'chemistry', title: 'Chemistry', detail: 'What sparks between you' },
  { id: 'preferences', title: 'Preferences', detail: 'How you like things done' },
  { id: 'future', title: 'Future experiences', detail: 'Things to try together' },
];

const p = (id: string, pack: PackId, level: Level, category: Category, a: string, b: string): Pick => ({ id: `p-${id}`, pack, level, category, a, b });

export const PICKS: Pick[] = [
  p('banter', 'flirting', 1, 'flirty', 'Flirty banter', 'Deep romantic conversation'),
  p('messages', 'flirting', 1, 'flirty', 'Sweet messages all day', 'One unexpected surprise'),
  p('eye', 'flirting', 1, 'flirty', 'A long look across the room', 'A whispered compliment'),
  p('tease', 'flirting', 2, 'playful', 'Being teased', 'Doing the teasing'),
  p('first-move', 'flirting', 2, 'flirty', 'Making the first move', 'Having the first move made on you'),
  p('text-call', 'flirting', 1, 'flirty', 'A flirty text', 'A flirty phone call'),
  p('jealous-joke', 'flirting', 2, 'playful', 'Playful competition', 'Playful cooperation'),
  p('dinner-drive', 'romance', 1, 'dates', 'A candlelit dinner', 'A spontaneous night drive'),
  p('planned-spont', 'romance', 1, 'dates', 'A carefully planned date', 'A completely spontaneous one'),
  p('getaway-home', 'romance', 2, 'dates', 'A surprise getaway', 'A surprise date at home'),
  p('letter-gift', 'romance', 1, 'romantic', 'A handwritten letter', 'A thoughtful gift'),
  p('rooftop-beach', 'romance', 2, 'dates', 'A rooftop at sunset', 'A beach at midnight'),
  p('dance-talk', 'romance', 2, 'romantic', 'Slow dancing', 'Staying up talking'),
  p('flowers-song', 'romance', 1, 'romantic', 'Flowers for no reason', 'A song dedicated to you'),
  p('kiss-tease', 'affection', 2, 'kissing', 'Long romantic kisses', 'Playful teasing'),
  p('cuddle', 'affection', 1, 'romantic', 'Falling asleep in each other’s arms', 'Waking up next to each other'),
  p('hand-arm', 'affection', 1, 'romantic', 'Holding hands', 'An arm around the shoulder'),
  p('kiss-hello', 'affection', 2, 'kissing', 'A kiss hello', 'A kiss goodbye'),
  p('slow-quick', 'affection', 3, 'kissing', 'A slow, lingering kiss', 'A sudden, spontaneous one'),
  p('neck-hand', 'affection', 3, 'kissing', 'A kiss on the neck', 'A kiss on the hand'),
  p('massage', 'affection', 3, 'playful', 'Giving a massage', 'Receiving one'),
  p('lead-together', 'chemistry', 2, 'desires', 'Taking the lead', 'Deciding together'),
  p('anticipation', 'chemistry', 3, 'desires', 'Building anticipation all day', 'A complete surprise'),
  p('confident-shy', 'chemistry', 2, 'flirty', 'Confident and direct', 'Shy and teasing'),
  p('lights', 'chemistry', 3, 'bold', 'Candlelight', 'Moonlight'),
  p('words-actions', 'chemistry', 3, 'desires', 'Being told what they want', 'Being shown'),
  p('playlist', 'chemistry', 3, 'romantic', 'A slow playlist', 'Complete silence'),
  p('dress-up', 'preferences', 2, 'dates', 'Dressing up for each other', 'Dressing down and getting cosy'),
  p('morning-night', 'preferences', 2, 'romantic', 'Morning romance', 'Late-night romance'),
  p('compliment-look', 'preferences', 1, 'compliments', 'Compliments on how you look', 'Compliments on who you are'),
  p('public-private', 'preferences', 3, 'bold', 'Flirting in public', 'Saving it for when you are alone'),
  p('plan-surprise', 'preferences', 2, 'romantic', 'Knowing the plan', 'Being kept guessing'),
  p('voice-text', 'preferences', 3, 'flirty', 'A voice note', 'A long message'),
  p('weekend-away', 'future', 2, 'dates', 'A weekend in the mountains', 'A weekend by the sea'),
  p('class', 'future', 1, 'dates', 'A dance class together', 'A cooking class together'),
  p('hotel', 'future', 3, 'dates', 'A fancy hotel for one night', 'A cabin for three nights'),
  p('new-city', 'future', 2, 'dates', 'Exploring a new city', 'Revisiting our favourite place'),
  p('ritual', 'future', 1, 'romantic', 'A weekly date night', 'A monthly surprise'),
  p('explore', 'future', 4, 'desires', 'Trying something new together', 'Perfecting what we already love'),
  p('tonight', 'future', 4, 'desires', 'Planning tonight together', 'Letting your partner plan it'),
  p('bold-date', 'future', 4, 'bold', 'A daring date idea', 'A classic one, done perfectly'),
  p('dare-truth', 'flirting', 4, 'playful', 'A bold dare', 'A bold truth'),
];
