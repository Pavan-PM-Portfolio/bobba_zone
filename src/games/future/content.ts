export interface FutureArea {
  id: string;
  title: string;
  talk: string;
  prompts: { text: string; options: string[] }[];
}

export const FUTURE_AREAS: FutureArea[] = [
  {
    id: 'travel',
    title: 'Travel and adventures',
    talk: 'What does a trip need to feel worth it to each of you?',
    prompts: [
      { text: 'Which shared experience should we prioritise in the next year?', options: ['A long trip somewhere far away', 'Several short getaways', 'Something adventurous: a trek or a dive', 'A slow holiday with nothing planned', 'Saving it for something bigger later'] },
      { text: 'How do you like to travel together?', options: ['Every day planned', 'A rough plan, lots of freedom', 'Completely spontaneous', 'Plans for one of us, free time for the other'] },
      { text: 'Where should our next big trip be?', options: ['Mountains', 'Beaches and islands', 'A big new city', 'Countryside and small towns', 'Somewhere neither of us would usually pick'] },
      { text: 'How often should we go away together?', options: ['Every couple of months', 'Twice a year', 'Once a year, done properly', 'When it feels right'] },
    ],
  },
  {
    id: 'career',
    title: 'Career and ambition',
    talk: 'What would each of you need from the other during a demanding season at work?',
    prompts: [
      { text: 'How should we balance personal ambitions and shared time?', options: ['Ambition first for a few years, then slow down', 'Protect shared time, even if careers move slower', 'Take turns supporting each other’s big pushes', 'Keep both in balance week to week'] },
      { text: 'Would you move cities for one of our careers?', options: ['Yes, if it is a big opportunity', 'Only for a short time', 'Only if it works for both of us', 'Probably not'] },
      { text: 'What does success look like in ten years?', options: ['Financial freedom', 'Work we both love', 'Time and flexibility', 'Building something of our own', 'A calm, steady life'] },
      { text: 'How do you feel about working evenings or weekends?', options: ['Fine when it matters', 'Occasionally, with notice', 'Keep them free wherever possible', 'Depends on the season'] },
    ],
  },
  {
    id: 'money',
    title: 'Money and lifestyle',
    talk: 'Which money conversation would you like to have more often, and which less?',
    prompts: [
      { text: 'What does financial security mean to you?', options: ['A safety net of several months', 'No debt at all', 'Owning our home', 'Being able to say yes to experiences', 'Enough to help family if needed'] },
      { text: 'How should we organise money?', options: ['Fully shared', 'Shared account plus personal money', 'Mostly separate, split shared costs', 'Not sure yet'] },
      { text: 'What kind of lifestyle would make us happiest?', options: ['Simple and low-cost, with savings', 'Comfortable, with some treats', 'Spend on experiences, save on things', 'Work hard, live well'] },
      { text: 'A big purchase comes up. How do we decide?', options: ['Discuss anything over an agreed amount', 'Trust each other to decide', 'Research together, then decide', 'Sleep on it, always'] },
    ],
  },
  {
    id: 'home',
    title: 'Family and home',
    talk: 'What makes a place feel like home to each of you?',
    prompts: [
      { text: 'Where would you like us to live long-term?', options: ['In a big city', 'Near family', 'Somewhere quiet and green', 'Abroad for a while', 'Wherever feels right later'] },
      { text: 'How often would you like to see family?', options: ['Every week', 'A few times a month', 'Every couple of months', 'On special occasions'] },
      { text: 'What should our home feel like?', options: ['Calm and minimal', 'Warm and full of things we love', 'Lively, always open to guests', 'Practical and easy to run'] },
      { text: 'How should we share the running of the house?', options: ['Split evenly by task', 'Whoever has more time that week', 'Each takes what we like doing', 'Outsource what we can'] },
    ],
  },
  {
    id: 'growth',
    title: 'Personal growth',
    talk: 'How can each of you support the other’s growth without pushing?',
    prompts: [
      { text: 'What area of personal growth matters most to you right now?', options: ['Health and fitness', 'Learning something new', 'Confidence', 'Patience and calm', 'Creativity'] },
      { text: 'How do you prefer to be encouraged?', options: ['Gentle reminders', 'Celebrating small wins', 'Doing it alongside me', 'Leaving me to it'] },
      { text: 'Would you like a shared goal for this year?', options: ['A fitness goal', 'A learning goal', 'A savings goal', 'A creative project', 'No shared goal, just support'] },
      { text: 'How much time alone do you need in a typical week?', options: ['Very little', 'An evening or two', 'A few hours most days', 'It changes a lot'] },
    ],
  },
  {
    id: 'time',
    title: 'Time together and independence',
    talk: 'What does a good week look like to each of you?',
    prompts: [
      { text: 'What would our ideal ordinary weekend look like?', options: ['Together the whole time', 'One day together, one day apart', 'Friends and plans', 'Rest and nothing scheduled'] },
      { text: 'How much should we share friendships?', options: ['Mostly shared friends', 'A mix of shared and separate', 'Mostly our own friends', 'Whatever happens naturally'] },
      { text: 'How often should we have a proper date night?', options: ['Every week', 'Every two weeks', 'Once a month', 'Whenever we feel like it'] },
      { text: 'How do you feel about separate trips with friends?', options: ['Love the idea', 'Fine now and then', 'I would rather we went together', 'Depends on the trip'] },
    ],
  },
  {
    id: 'traditions',
    title: 'Traditions and celebrations',
    talk: 'Which tradition from your childhood would you like to bring into our life?',
    prompts: [
      { text: 'How should we celebrate our anniversary?', options: ['A trip', 'A special dinner', 'Recreate our first date', 'Something new every year', 'Quietly, just us'] },
      { text: 'How do you like to celebrate birthdays?', options: ['A big gathering', 'A small group of close people', 'Just the two of us', 'Keep it low-key'] },
      { text: 'Which festivals or holidays matter most to you?', options: ['Family festivals', 'New Year', 'Our own invented occasions', 'All of them', 'None in particular'] },
      { text: 'What weekly ritual would you like us to keep?', options: ['A long Sunday breakfast', 'A walk together', 'Cooking a new recipe', 'A screen-free evening', 'A weekly check-in chat'] },
    ],
  },
  {
    id: 'long',
    title: 'Long-term aspirations',
    talk: 'What is one thing each of you wants to be able to say about your life together in twenty years?',
    prompts: [
      { text: 'What would you most like us to have built in twenty years?', options: ['A home full of memories', 'A business or project', 'A big circle of friends', 'Financial independence', 'A life of adventures'] },
      { text: 'How do you picture retirement?', options: ['Travelling', 'Close to family', 'Somewhere peaceful', 'Still working on something we love', 'Too far away to picture'] },
      { text: 'What should we give back to?', options: ['Our community', 'Education', 'Animals or nature', 'Family', 'Still figuring it out'] },
      { text: 'What is one risk worth taking together?', options: ['Moving abroad', 'Starting something of our own', 'A big career change', 'A long sabbatical', 'None, steady suits us'] },
    ],
  },
];

export const IMPORTANCE = [
  { id: 'important', label: 'Important to me' },
  { id: 'flexible', label: 'Flexible' },
  { id: 'unsure', label: 'Something I am still figuring out' },
] as const;
export type Importance = (typeof IMPORTANCE)[number]['id'];

export interface FuturePrompt {
  area: FutureArea;
  text: string;
  options: string[];
  index: number;
  lastInArea: boolean;
}

export function futurePrompts(areaIds?: string[]): FuturePrompt[] {
  const out: FuturePrompt[] = [];
  for (const a of FUTURE_AREAS.filter((x) => !areaIds?.length || areaIds.includes(x.id))) {
    a.prompts.forEach((p, j) => out.push({ area: a, text: p.text, options: p.options, index: out.length, lastInArea: j === a.prompts.length - 1 }));
  }
  return out;
}
