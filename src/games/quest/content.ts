export type Budget = 0 | 1 | 2;
export type Time = 1 | 2 | 3;

export interface Challenge {
  id: string;
  title: string;
  kind: 'Date' | 'Kindness' | 'Create' | 'Plan' | 'Remember';
  budget: Budget;
  time: Time;
  brief: string;
  ideaPrompt: string;
}

export const BUDGETS: { id: Budget; label: string; detail: string }[] = [
  { id: 0, label: 'Free', detail: 'Nothing to spend' },
  { id: 1, label: 'Small', detail: 'A coffee or a cheap meal' },
  { id: 2, label: 'Treat', detail: 'Something special' },
];

export const TIMES: { id: Time; label: string; detail: string }[] = [
  { id: 1, label: 'Under an hour', detail: 'Fits into a weeknight' },
  { id: 2, label: 'A few hours', detail: 'An evening or afternoon' },
  { id: 3, label: 'A whole day', detail: 'Weekend-sized' },
];

export const CHALLENGES: Challenge[] = [
  { id: 'three-things', title: 'Three things', kind: 'Kindness', budget: 0, time: 1, brief: 'Each tell the other three specific things you appreciate about them. Not general ones: moments, habits, words.', ideaPrompt: 'Write one of your three here to keep.' },
  { id: 'playlist', title: 'A playlist for you', kind: 'Create', budget: 0, time: 1, brief: 'Each make a short playlist for the other: songs that remind you of them, or that you want them to hear. Swap and listen together.', ideaPrompt: 'Name your playlist and the first song on it.' },
  { id: 'dream-date', title: 'Dream date on a budget', kind: 'Plan', budget: 0, time: 1, brief: 'Plan the best possible date within the budget you set. Agree on one version you will actually do this month.', ideaPrompt: 'Your idea for the date, in one or two lines.' },
  { id: 'kindness', title: 'A quiet act of kindness', kind: 'Kindness', budget: 0, time: 1, brief: 'Each choose a small kind thing to do for the other this week, without saying what it is. Reveal when you are done.', ideaPrompt: 'Write it after you have done it.' },
  { id: 'getaway', title: 'Imaginary weekend away', kind: 'Plan', budget: 0, time: 1, brief: 'Design a weekend getaway with no limits: place, where you stay, one thing you do each day. Then find the version you could afford.', ideaPrompt: 'Your dream destination and the one thing you would do there.' },
  { id: 'first-date-again', title: 'First date, again', kind: 'Remember', budget: 1, time: 2, brief: 'Revisit where you first met or first went out, or recreate it at home if that is not possible.', ideaPrompt: 'What detail from the first time should we recreate?' },
  { id: 'cook-new', title: 'Cook something neither of you has made', kind: 'Date', budget: 1, time: 2, brief: 'Pick a cuisine or dish that is new to both of you. Shop, cook and eat it together.', ideaPrompt: 'Suggest a dish.' },
  { id: 'letters', title: 'Letters for later', kind: 'Create', budget: 0, time: 1, brief: 'Each write a letter to the other, to be opened on a date you choose: an anniversary, a birthday, or a year from now.', ideaPrompt: 'When should the letters be opened?' },
  { id: 'sunrise', title: 'Watch a sunrise', kind: 'Date', budget: 0, time: 2, brief: 'Find a good spot, set an alarm, bring something warm to drink.', ideaPrompt: 'Where should we watch it from?' },
  { id: 'skill-swap', title: 'Teach me something', kind: 'Create', budget: 0, time: 2, brief: 'Each teach the other something you know well, for twenty minutes each. A recipe, a game, a phrase in another language.', ideaPrompt: 'What will you teach?' },
  { id: 'new-place', title: 'A place neither of us knows', kind: 'Date', budget: 1, time: 2, brief: 'Visit a neighbourhood, museum, café or park neither of you has been to before.', ideaPrompt: 'Suggest a place.' },
  { id: 'photo-walk', title: 'Photo walk', kind: 'Create', budget: 0, time: 2, brief: 'Go for a walk and each take ten photos of things the other would like. Compare them over a drink afterwards.', ideaPrompt: 'Pick a theme for the photos.' },
  { id: 'memory-box', title: 'Start a memory box', kind: 'Remember', budget: 1, time: 1, brief: 'Find a box and fill it with the first few things worth keeping: tickets, notes, a photo, something from a trip.', ideaPrompt: 'What is the first thing going in?' },
  { id: 'surprise-evening', title: 'Surprise evening', kind: 'Date', budget: 2, time: 2, brief: 'Take turns: one plans an evening and keeps it secret until the day. Next time, swap.', ideaPrompt: 'A hint for your partner (if you are planning).' },
  { id: 'day-trip', title: 'Spontaneous day trip', kind: 'Date', budget: 2, time: 3, brief: 'Pick a direction or a train and go for the day. Plan only the way back.', ideaPrompt: 'Where could we go?' },
  { id: 'tradition', title: 'Invent a tradition', kind: 'Plan', budget: 0, time: 1, brief: 'Create a small ritual that is only yours: a monthly breakfast, a yearly walk, a toast you always make.', ideaPrompt: 'Your idea for our tradition.' },
  { id: 'favourite-memory', title: 'Revisit a favourite memory', kind: 'Remember', budget: 0, time: 1, brief: 'Each pick a favourite memory together. Find the photos, retell it from your side, and notice what the other remembers differently.', ideaPrompt: 'Which memory did you pick?' },
  { id: 'class', title: 'Take a class together', kind: 'Date', budget: 2, time: 2, brief: 'Pottery, dance, cooking, climbing: something you are both beginners at.', ideaPrompt: 'Suggest a class.' },
  { id: 'gratitude-jar', title: 'A month of notes', kind: 'Kindness', budget: 0, time: 1, brief: 'Each day this month, leave the other a one-line note somewhere they will find it.', ideaPrompt: 'Write the first note here.' },
  { id: 'stay-in-getaway', title: 'A getaway at home', kind: 'Date', budget: 1, time: 3, brief: 'Turn a whole day at home into a holiday: no chores, no screens, a special breakfast and a plan you would follow on a trip.', ideaPrompt: 'The one thing that would make it feel like a holiday.' },
];
