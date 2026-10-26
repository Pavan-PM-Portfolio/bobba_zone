export interface StoryChapter {
  id: string;
  title: string;
  prompts: string[];
}

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 'first',
    title: 'First impressions',
    prompts: [
      'What do you remember about the first time you saw me?',
      'What did you think of me after our first proper conversation?',
      'When did you realise you wanted to see me again?',
    ],
  },
  {
    id: 'early',
    title: 'Early conversations',
    prompts: [
      'Which early conversation do you still think about?',
      'What was the first thing that made you laugh with me?',
      'What did you find out about me early on that surprised you?',
    ],
  },
  {
    id: 'dates',
    title: 'Memorable dates',
    prompts: [
      'Describe a date you would happily relive exactly as it happened.',
      'Which plan went wrong but turned into a good memory?',
      'What is the most ordinary day together that you remember fondly?',
    ],
  },
  {
    id: 'funny',
    title: 'Funny moments',
    prompts: [
      'What is the moment we laughed hardest together?',
      'Which running joke between us do you love most, and how did it start?',
      'What is the most embarrassing thing that has happened to us?',
    ],
  },
  {
    id: 'gestures',
    title: 'Thoughtful gestures',
    prompts: [
      'What is something I did that made you feel truly cared for?',
      'Which small habit of mine do you secretly love?',
      'What gift or gesture from me meant more than I probably realise?',
    ],
  },
  {
    id: 'through',
    title: 'Hard times we got through',
    prompts: [
      'Describe a difficult moment we got through together. What helped?',
      'When did you feel we became a real team?',
      'What did a hard time teach you about us?',
    ],
  },
  {
    id: 'proud',
    title: 'Moments of pride',
    prompts: [
      'When have you been proudest of me?',
      'What is something we built or achieved together that you are proud of?',
      'When did you feel proud to introduce me to someone?',
    ],
  },
  {
    id: 'next',
    title: 'Memories still to make',
    prompts: [
      'What memory do you hope we make in the next year?',
      'Where do you picture us celebrating a big anniversary?',
      'What tradition would you like us to start?',
    ],
  },
];

export interface StoryPrompt {
  chapter: StoryChapter;
  text: string;
  index: number;
}

export function promptsFor(chapterIds: string[] | undefined): StoryPrompt[] {
  const chosen = STORY_CHAPTERS.filter((c) => !chapterIds?.length || chapterIds.includes(c.id));
  const out: StoryPrompt[] = [];
  for (const c of chosen) for (const text of c.prompts) out.push({ chapter: c, text, index: out.length });
  return out;
}
