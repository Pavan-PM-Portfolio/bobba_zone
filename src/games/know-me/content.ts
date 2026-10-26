export type KnowCategory = 'Everyday' | 'Comfort' | 'Love' | 'Dreams' | 'Stress' | 'Past';

export interface KnowQuestion {
  id: string;
  category: KnowCategory;
  /** Shown to the person answering about themselves. */
  you: string;
  /** Shown to the predictor; {name} is the answerer. */
  them: string;
  options?: { id: string; label: string }[];
}

const o = (...labels: string[]) => labels.map((label, i) => ({ id: String.fromCharCode(97 + i), label }));

export const KNOW_QUESTIONS: KnowQuestion[] = [
  { id: 'appreciated', category: 'Love', you: 'What makes you feel most appreciated after a difficult day?', them: 'What makes {name} feel most appreciated after a difficult day?',
    options: o('Being told what I did well', 'A quiet evening with no plans', 'Someone taking a task off my plate', 'A long hug and no questions', 'A small treat or surprise') },
  { id: 'sunday', category: 'Everyday', you: 'What is your ideal free Sunday?', them: "What is {name}'s ideal free Sunday?",
    options: o('A slow morning and nowhere to be', 'Out early on a day trip', 'Seeing friends or family', 'Catching up on a project or hobby', 'Cooking something ambitious') },
  { id: 'stress-support', category: 'Stress', you: 'What kind of support do you value most when stressed?', them: 'What kind of support does {name} value most when stressed?',
    options: o('Help solving the problem', 'Just listening, no advice', 'Distraction and lightness', 'Space to think on my own first', 'Practical help with everything else') },
  { id: 'experience', category: 'Dreams', you: 'What is one experience you would love us to have together?', them: 'What is one experience {name} would love the two of you to have together?' },
  { id: 'gesture', category: 'Love', you: 'What small gesture makes you feel loved?', them: 'What small gesture makes {name} feel loved?' },
  { id: 'understood', category: 'Past', you: 'What is something you wish people understood about you?', them: 'What does {name} wish people understood about them?' },
  { id: 'recharge', category: 'Comfort', you: 'How do you most like to recharge?', them: 'How does {name} most like to recharge?',
    options: o('Time completely alone', 'Time with just the two of us', 'Being around lots of people', 'Moving: a walk, run or workout', 'Sleep, honestly') },
  { id: 'comfort-food', category: 'Comfort', you: 'What food do you reach for on a bad day?', them: 'What food does {name} reach for on a bad day?' },
  { id: 'decision', category: 'Everyday', you: 'How do you usually make a big decision?', them: 'How does {name} usually make a big decision?',
    options: o('Lists and research', 'Gut feeling', 'Talking it through with someone', 'Sleeping on it', 'Putting it off as long as possible') },
  { id: 'proud', category: 'Past', you: 'Which achievement are you quietly proudest of?', them: 'Which achievement is {name} quietly proudest of?' },
  { id: 'love-language', category: 'Love', you: 'Which of these lands most for you?', them: 'Which of these lands most for {name}?',
    options: o('Words: hearing it said', 'Time: undivided attention', 'Touch: closeness', 'Acts: things done for me', 'Gifts: being thought of') },
  { id: 'dream-trip', category: 'Dreams', you: 'Where in the world would you go next, if money and time were no issue?', them: 'Where would {name} go next, if money and time were no issue?' },
  { id: 'worry', category: 'Stress', you: 'What do you tend to worry about more than you say?', them: 'What does {name} tend to worry about more than they say?',
    options: o('Work or career', 'Money', 'Family', 'Health', 'Whether I am doing enough') },
  { id: 'morning', category: 'Everyday', you: 'What does your perfect morning look like?', them: "What does {name}'s perfect morning look like?",
    options: o('Up early with time to myself', 'Lie-in, then a slow breakfast', 'Straight into something productive', 'Coffee first, conversation later', 'A walk before anything else') },
  { id: 'childhood', category: 'Past', you: 'What is a childhood memory that still makes you smile?', them: 'What is a childhood memory that still makes {name} smile?' },
  { id: 'apology', category: 'Love', you: 'After a disagreement, what helps you feel things are really okay again?', them: 'After a disagreement, what helps {name} feel things are really okay again?',
    options: o('A clear apology in words', 'Talking it through fully', 'Some time, then a fresh start', 'A kind gesture or touch', 'Laughing about something together') },
  { id: 'skill', category: 'Dreams', you: 'What skill would you love to learn this year?', them: 'What skill would {name} love to learn this year?' },
  { id: 'overwhelmed', category: 'Stress', you: 'When you are overwhelmed, what do you do first?', them: 'When {name} is overwhelmed, what do they do first?',
    options: o('Make a list', 'Go quiet', 'Talk to someone', 'Tidy or clean something', 'Keep busy and push through') },
  { id: 'song', category: 'Comfort', you: 'Which song or artist do you play when you need a lift?', them: 'Which song or artist does {name} play when they need a lift?' },
  { id: 'celebrate', category: 'Everyday', you: 'How do you like to celebrate good news?', them: 'How does {name} like to celebrate good news?',
    options: o('A nice dinner out', 'Telling everyone', 'A quiet moment with you', 'Treating myself to something', 'Getting straight back to work') },
  { id: 'first-noticed', category: 'Past', you: 'What did you first notice about me?', them: 'What did {name} first notice about you?' },
  { id: 'home', category: 'Dreams', you: 'Which home would you choose for us in ten years?', them: 'Which home would {name} choose for the two of you in ten years?',
    options: o('A city apartment with a view', 'A house with a garden', 'Somewhere by the sea', 'Somewhere quiet in the hills', 'Wherever work takes us') },
  { id: 'rest', category: 'Comfort', you: 'What is your favourite way to spend a rainy evening?', them: "What is {name}'s favourite way to spend a rainy evening?",
    options: o('A film and blankets', 'Cooking together', 'Reading', 'Games or puzzles', 'Talking for hours') },
  { id: 'reassure', category: 'Stress', you: 'What is the most reassuring thing someone can say to you?', them: 'What is the most reassuring thing someone can say to {name}?' },
  { id: 'surprise', category: 'Love', you: 'Which surprise would you enjoy most?', them: 'Which surprise would {name} enjoy most?',
    options: o('A planned trip', 'A handwritten letter', 'Their favourite meal, cooked at home', 'Tickets to something', 'A day with every chore done') },
  { id: 'pet-peeve', category: 'Everyday', you: 'What small thing annoys you more than it should?', them: 'What small thing annoys {name} more than it should?' },
  { id: 'saturday-night', category: 'Everyday', you: 'Saturday night: what are you hoping for?', them: 'Saturday night: what is {name} hoping for?',
    options: o('Dinner and drinks out', 'Friends over', 'A night in, just us', 'Something new: a class, a show', 'An early night') },
  { id: 'role-model', category: 'Past', you: 'Who has influenced you the most?', them: 'Who has influenced {name} the most?' },
  { id: 'ambition', category: 'Dreams', you: 'What would you do if you knew you could not fail?', them: 'What would {name} do if they knew they could not fail?' },
  { id: 'sick-day', category: 'Comfort', you: 'When you are unwell, what do you want from me?', them: 'When {name} is unwell, what do they want from you?',
    options: o('Fuss over me', 'Leave me to rest', 'Bring supplies, then let me be', 'Keep me company', 'Pretend I am fine') },
  { id: 'proud-of-us', category: 'Love', you: 'What are you proudest of about us?', them: 'What is {name} proudest of about the two of you?' },
  { id: 'money', category: 'Dreams', you: 'An unexpected bonus arrives. What do you do?', them: 'An unexpected bonus arrives. What does {name} do?',
    options: o('Save most of it', 'Plan a trip', 'Treat both of us', 'Invest in a goal', 'Give some away') },
  { id: 'tired-signal', category: 'Stress', you: 'What is the first sign you are running on empty?', them: 'What is the first sign {name} is running on empty?' },
  { id: 'friend-describe', category: 'Past', you: 'How would your oldest friend describe you in one word?', them: "How would {name}'s oldest friend describe them in one word?" },
];

export const KNOW_LENGTHS = [
  { id: 12, title: 'Short', detail: '12 questions, about 25 minutes' },
  { id: 20, title: 'Standard', detail: '20 questions, about 40 minutes' },
  { id: 30, title: 'Long', detail: '30 questions, about an hour' },
] as const;
