export interface Level {
  n: 1 | 2 | 3 | 4;
  title: string;
  detail: string;
  prompts: { text: string; followUp: string }[];
}

export const LEVELS: Level[] = [
  {
    n: 1,
    title: 'Sweet',
    detail: 'Warm, light and easy to answer.',
    prompts: [
      { text: 'What little thing I do makes you smile when you think about me?', followUp: 'When did you last notice it?' },
      { text: 'What is your favourite photo of us, and why?', followUp: 'Find it and look at it together.' },
      { text: 'Which moment today would you have liked to share with me?', followUp: 'Tell the whole story now.' },
      { text: 'What do you love about how we spend ordinary evenings?', followUp: 'Is there one thing that would make them even better?' },
      { text: 'What is a compliment from me that stayed with you?', followUp: 'What made it land?' },
      { text: 'Which of my habits would you miss most if it disappeared?', followUp: 'Do the other habits make up for it?' },
      { text: 'What song makes you think of me?', followUp: 'Play it now.' },
      { text: 'What is the kindest thing I have done for someone else that you saw?', followUp: 'Why did it stay with you?' },
      { text: 'Describe a perfect lazy morning with me.', followUp: 'When can we have one?' },
      { text: 'What made you feel at home with me for the first time?', followUp: 'Do you still feel that?' },
      { text: 'Which word would you use for us right now?', followUp: 'Compare your words.' },
      { text: 'What is something about me you would brag about to a friend?', followUp: 'Say it to me directly.' },
    ],
  },
  {
    n: 2,
    title: 'Romantic',
    detail: 'Dates, gestures and the feeling of falling for each other.',
    prompts: [
      { text: 'What kind of date would make you feel especially loved?', followUp: 'What is one detail that would make it perfect?' },
      { text: 'What is one romantic memory you would happily relive?', followUp: 'What would you keep exactly the same?' },
      { text: 'When do you feel closest to me?', followUp: 'How can we make more of those moments?' },
      { text: 'What is the most romantic thing I have ever said to you?', followUp: 'Do you remember how you responded?' },
      { text: 'Where would you take me for a night that is just ours?', followUp: 'What would we wear?' },
      { text: 'When did you know you were falling for me?', followUp: 'Did you tell anyone at the time?' },
      { text: 'What gesture of mine still gives you butterflies?', followUp: 'Show me how it feels from your side.' },
      { text: 'Which place feels like it belongs to us?', followUp: 'When should we go back?' },
      { text: 'Write the first line of a love letter to me.', followUp: 'Finish it later and leave it somewhere for me to find.' },
      { text: 'What would a surprise from me look like that you would never expect?', followUp: 'Should I take notes?' },
      { text: 'What do you love about the way I look at you?', followUp: 'Look at each other for ten seconds without talking.' },
      { text: 'Which slow dance song would you choose for us?', followUp: 'Put it on.' },
    ],
  },
  {
    n: 3,
    title: 'Deeper connection',
    detail: 'Honest, reflective questions that take a little courage.',
    prompts: [
      { text: 'When do you feel most understood by me?', followUp: 'What do I do in those moments?' },
      { text: 'What do you need more of from me right now?', followUp: 'What would that look like day to day?' },
      { text: 'What is something you have never quite found the words to tell me?', followUp: 'Take your time.' },
      { text: 'What kind of affection makes you feel most connected?', followUp: 'Has that changed over time?' },
      { text: 'What fear do you carry about the future that I might not know about?', followUp: 'How can I help hold it?' },
      { text: 'When did you feel most supported by me?', followUp: 'What exactly helped?' },
      { text: 'What part of yourself do you show only me?', followUp: 'How does it feel to share it?' },
      { text: 'How have I changed you?', followUp: 'Is there a change you are proud of?' },
      { text: 'What does feeling safe with someone mean to you?', followUp: 'When do you feel it most with me?' },
      { text: 'What is a hope you have for us that you rarely say out loud?', followUp: 'What is one step towards it?' },
      { text: 'What do you want me to remember when we argue?', followUp: 'Write it somewhere we will see it.' },
      { text: 'What is something you are still learning to accept about yourself?', followUp: 'What do you see in them that they might not?' },
    ],
  },
  {
    n: 4,
    title: 'Playfully flirtatious',
    detail: 'Teasing and charming. Never explicit, always optional.',
    prompts: [
      { text: 'What is something we have never tried together that you would like to?', followUp: 'Pick a date for it, or agree to leave it as a nice idea.' },
      { text: 'What outfit of mine is your favourite?', followUp: 'Ask for it on your next date.' },
      { text: 'Describe the moment you found me most attractive.', followUp: 'Do you remember what I was doing?' },
      { text: 'What is your favourite way for me to greet you after a long day?', followUp: 'Practise it tonight.' },
      { text: 'Which of my features do you find hardest to resist?', followUp: 'Say it to my face.' },
      { text: 'If we had a whole evening to ourselves tonight, how would you begin it?', followUp: 'Only plan as far as you are both happy to.' },
      { text: 'What is the most charming thing I do without realising?', followUp: 'Now I will realise. Sorry.' },
      { text: 'Send me a one-line flirt you would text me during a boring meeting.', followUp: 'Actually send it next week.' },
      { text: 'Where is the most unexpected place you have wanted to kiss me?', followUp: 'Keep it a secret or plan a return visit.' },
      { text: 'What is your favourite thing about our chemistry?', followUp: 'When did you first notice it?' },
      { text: 'What would your perfect date night outfit for me be?', followUp: 'Compare your answers.' },
      { text: 'Which compliment from me would make you blush?', followUp: 'Find out.' },
    ],
  },
];

export const levelByN = (n: number) => LEVELS.find((l) => l.n === n) ?? LEVELS[0]!;
