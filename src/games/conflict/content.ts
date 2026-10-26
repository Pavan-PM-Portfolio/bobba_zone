export type Style = 'talk' | 'pause' | 'write' | 'repair';

export const STYLES: Record<Style, { label: string; description: string }> = {
  talk: { label: 'Talk it out now', description: 'Address it directly while it is fresh.' },
  pause: { label: 'Pause first', description: 'Take some space, then come back to it.' },
  write: { label: 'Put it in words', description: 'Write it down or message to get it clear.' },
  repair: { label: 'Repair first', description: 'Reconnect with a gesture, then discuss.' },
};

export const NEEDS = [
  { id: 'heard', label: 'To feel heard' },
  { id: 'reassured', label: 'Reassurance' },
  { id: 'space', label: 'Some space' },
  { id: 'plan', label: 'A clear plan' },
  { id: 'apology', label: 'An apology' },
  { id: 'appreciated', label: 'To feel appreciated' },
] as const;
export type Need = (typeof NEEDS)[number]['id'];

export interface ConflictScenario {
  id: string;
  theme: string;
  situation: string;
  question: string;
  responses: { text: string; style: Style }[];
}

export const REFLECTIONS = [
  'What need might each person be expressing?',
  'What would help each person feel heard?',
  'What could a fair repair look like?',
  'When might a pause help, and when might reconnection matter more?',
];

export const CONFLICT_SCENARIOS: ConflictScenario[] = [
  { id: 'dishes', theme: 'Unmet expectations', situation: 'Asha comes home to a sink of dishes after Rohan said he would do them. Rohan had a draining day and forgot.',
    question: 'If you were Asha, how would you respond?',
    responses: [
      { text: 'Say calmly that I am disappointed and ask what happened', style: 'talk' },
      { text: 'Do something else for an hour, then bring it up', style: 'pause' },
      { text: 'Send a message later explaining why it matters to me', style: 'write' },
      { text: 'Make tea for us both first, then mention it gently', style: 'repair' },
    ] },
  { id: 'late-reply', theme: 'Miscommunication', situation: 'Maya messaged Dev about weekend plans and got no reply all day. Dev saw it, meant to answer later, then forgot.',
    question: 'If you were Maya, how would you respond?',
    responses: [
      { text: 'Call and ask directly what is going on', style: 'talk' },
      { text: 'Wait until I feel less annoyed before saying anything', style: 'pause' },
      { text: 'Send a clear message about how the silence felt', style: 'write' },
      { text: 'Start with something warm, then raise it', style: 'repair' },
    ] },
  { id: 'overbooked', theme: 'Busy schedules', situation: 'Sam has booked four evenings out this week. Lena was hoping for quiet nights together.',
    question: 'If you were Lena, how would you respond?',
    responses: [
      { text: 'Talk about it tonight before the week gets going', style: 'talk' },
      { text: 'Let this week happen, then talk about next time', style: 'pause' },
      { text: 'Share the calendar and suggest which evening to protect', style: 'write' },
      { text: 'Plan something lovely for one free evening, then talk', style: 'repair' },
    ] },
  { id: 'interrupted', theme: 'Feeling unheard', situation: 'At dinner with friends, Arjun keeps finishing Priya’s sentences. She feels talked over.',
    question: 'If you were Priya, how would you respond?',
    responses: [
      { text: 'Mention it on the walk home', style: 'talk' },
      { text: 'Sleep on it and raise it tomorrow', style: 'pause' },
      { text: 'Write down a couple of examples so it is clear', style: 'write' },
      { text: 'Squeeze his hand and smile at the table, talk later', style: 'repair' },
    ] },
  { id: 'apology-half', theme: 'Apologies and accountability', situation: 'After an argument, Zoe says "sorry you feel that way". Kai doesn’t feel it is a real apology.',
    question: 'If you were Kai, how would you respond?',
    responses: [
      { text: 'Explain kindly what a real apology would sound like to me', style: 'talk' },
      { text: 'Leave it for now and come back when calmer', style: 'pause' },
      { text: 'Write what I needed to hear and why', style: 'write' },
      { text: 'Accept the gesture for tonight and talk properly later', style: 'repair' },
    ] },
  { id: 'solo-trip', theme: 'Independence and closeness', situation: 'Nina wants a week-long solo trip. Leo feels a bit left out and worries what it means.',
    question: 'If you were Leo, how would you respond?',
    responses: [
      { text: 'Ask directly what the trip means to her', style: 'talk' },
      { text: 'Take a day to sort out my own feelings first', style: 'pause' },
      { text: 'Write down my worries so I can share them clearly', style: 'write' },
      { text: 'Tell her I support it, then share how I feel', style: 'repair' },
    ] },
  { id: 'money-spend', theme: 'Unmet expectations', situation: 'Ravi made a large purchase without mentioning it. Meera thought they agreed to discuss big spends.',
    question: 'If you were Meera, how would you respond?',
    responses: [
      { text: 'Bring it up straight away, calmly', style: 'talk' },
      { text: 'Wait until I can talk without sounding angry', style: 'pause' },
      { text: 'Suggest writing down a simple spending agreement', style: 'write' },
      { text: 'Acknowledge he must have wanted it, then remind him of the agreement', style: 'repair' },
    ] },
  { id: 'phone-call', theme: 'Feeling unheard', situation: 'Ella is telling Tom about a hard day. Tom keeps looking at his phone.',
    question: 'If you were Ella, how would you respond?',
    responses: [
      { text: 'Stop and say "I need you to really listen right now"', style: 'talk' },
      { text: 'Stop talking and pick it up later', style: 'pause' },
      { text: 'Text him afterwards explaining how it felt', style: 'write' },
      { text: 'Ask for a hug first, then try again', style: 'repair' },
    ] },
  { id: 'family-visit', theme: 'Busy schedules', situation: 'Ishaan agreed to a long family visit without checking. Tara had plans that weekend.',
    question: 'If you were Tara, how would you respond?',
    responses: [
      { text: 'Talk it through now and decide together', style: 'talk' },
      { text: 'Take the evening to cool off first', style: 'pause' },
      { text: 'Lay out both options in a message so we can compare', style: 'write' },
      { text: 'Say I know he meant well, then explain the clash', style: 'repair' },
    ] },
  { id: 'joke-hurt', theme: 'Miscommunication', situation: 'Ben makes a joke about Ana’s cooking. He meant it fondly; she found it hurtful.',
    question: 'If you were Ana, how would you respond?',
    responses: [
      { text: 'Say right then that it stung', style: 'talk' },
      { text: 'Let it pass and mention it later', style: 'pause' },
      { text: 'Message him about it so I can say it well', style: 'write' },
      { text: 'Tease him back lightly, then tell him it hurt', style: 'repair' },
    ] },
  { id: 'chores-split', theme: 'Unmet expectations', situation: 'Jay feels he does most of the housework. Mira feels she handles all the planning and bills.',
    question: 'If you were Jay, how would you respond?',
    responses: [
      { text: 'Sit down and list everything each of us does', style: 'write' },
      { text: 'Raise it directly the next time I am doing chores', style: 'talk' },
      { text: 'Wait for a calm weekend to bring it up', style: 'pause' },
      { text: 'Thank her for what she does, then share how I feel', style: 'repair' },
    ] },
  { id: 'cold-shoulder', theme: 'Different conflict styles', situation: 'After a disagreement, Noor goes quiet for hours. Sami wants to sort it out immediately.',
    question: 'If you were Sami, how would you respond?',
    responses: [
      { text: 'Gently ask if we can talk now', style: 'talk' },
      { text: 'Give her the quiet and wait for her', style: 'pause' },
      { text: 'Leave a note saying I am here when she is ready', style: 'write' },
      { text: 'Bring her a cup of tea without saying anything', style: 'repair' },
    ] },
  { id: 'forgotten-date', theme: 'Apologies and accountability', situation: 'Leo forgot an anniversary dinner booking. Isla had been looking forward to it for weeks.',
    question: 'If you were Leo, how would you respond?',
    responses: [
      { text: 'Apologise clearly and ask how she feels', style: 'talk' },
      { text: 'Give her space tonight, apologise properly tomorrow', style: 'pause' },
      { text: 'Write her a proper apology letter', style: 'write' },
      { text: 'Rebook something special straight away, then apologise', style: 'repair' },
    ] },
  { id: 'career-move', theme: 'Independence and closeness', situation: 'Kiran is offered a job in another city. Anya hears about it from a friend first.',
    question: 'If you were Anya, how would you respond?',
    responses: [
      { text: 'Ask him about it as soon as I see him', style: 'talk' },
      { text: 'Take a day before raising it', style: 'pause' },
      { text: 'Write down my questions so I don’t get lost in the hurt', style: 'write' },
      { text: 'Congratulate him first, then say how hearing it secondhand felt', style: 'repair' },
    ] },
];
