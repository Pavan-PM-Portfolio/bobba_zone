import type { Category, Level } from './taxonomy';

export interface Prediction {
  id: string;
  level: Level;
  category: Category;
  /** {name} = the person answering about themselves */
  you: string;
  them: string;
  options: string[];
  talk: string;
}

const q = (id: string, level: Level, category: Category, you: string, them: string, options: string[], talk: string): Prediction => ({
  id: `k-${id}`, level, category, you, them, options, talk,
});

export const PREDICTIONS: Prediction[] = [
  q('appreciated', 1, 'romantic', 'What makes you feel appreciated?', 'What makes {name} feel appreciated?', ['Being told, in words', 'Small surprises', 'Undivided attention', 'Physical affection', 'Help without asking'], 'When did you last feel that way?'),
  q('surprise', 1, 'dates', 'Which romantic surprise would you enjoy most?', 'Which romantic surprise would {name} enjoy most?', ['A planned weekend away', 'A love letter', 'Dinner cooked at home', 'Tickets to something', 'A picnic somewhere new'], 'What would make it perfect?'),
  q('reconnect', 1, 'romantic', 'How do you prefer to reconnect after a busy day?', 'How does {name} prefer to reconnect after a busy day?', ['A long hug', 'Talking it all through', 'Quiet time side by side', 'Cooking together', 'Going out'], 'What helps most on the hardest days?'),
  q('affection', 2, 'romantic', 'Which kind of affection makes you feel closest to me?', 'Which kind of affection makes {name} feel closest to you?', ['Holding hands', 'Cuddling', 'Kisses', 'A hand on the back', 'Playing with hair'], 'Show each other.'),
  q('atmosphere', 2, 'dates', 'What is your ideal date-night atmosphere?', "What is {name}'s ideal date-night atmosphere?", ['Candlelit and quiet', 'Lively and buzzing', 'Outdoors under the stars', 'Cosy at home', 'Somewhere fancy'], 'Plan one this month.'),
  q('flirting', 2, 'flirty', 'What kind of flirting do you find most enjoyable?', 'What kind of flirting does {name} find most enjoyable?', ['Teasing', 'Compliments', 'Eye contact', 'Playful touch', 'Witty messages'], 'Demonstrate.'),
  q('kiss', 2, 'kissing', 'What kind of kiss do you like most?', 'What kind of kiss does {name} like most?', ['Slow and gentle', 'Playful and quick', 'Long and lingering', 'Surprise kisses', 'Forehead kisses'], 'When was the last perfect one?'),
  q('compliment', 1, 'compliments', 'Which compliment means the most to you?', 'Which compliment means the most to {name}?', ['About my looks', 'About my mind', 'About my kindness', 'About my humour', 'About how I make you feel'], 'Say one now.'),
  q('mood', 3, 'desires', 'What sets the mood for you fastest?', 'What sets the mood for {name} fastest?', ['Music', 'Candles and low light', 'A long kiss', 'Flirty messages earlier', 'Getting dressed up'], 'Remember this one.'),
  q('initiative', 3, 'desires', 'How do you like romance to start?', 'How does {name} like romance to start?', ['A look', 'A touch', 'Words', 'A plan made earlier', 'Completely unplanned'], 'Has that changed over time?'),
  q('tease-response', 3, 'playful', 'When I tease you, how do you usually react?', 'When you tease {name}, how do they usually react?', ['Tease back', 'Blush', 'Pretend not to notice', 'Escalate', 'Laugh'], 'Test it later.'),
  q('date-ideal', 2, 'dates', 'Pick our next date.', 'Which date would {name} pick next?', ['Rooftop dinner', 'Weekend away', 'Dance class', 'Stargazing', 'Night in with a film'], 'Book it.'),
  q('want-more', 3, 'desires', 'What would you like more of from me?', 'What would {name} like more of from you?', ['Compliments', 'Initiative', 'Affection', 'Surprises', 'Undivided time'], 'What would it look like day to day?'),
  q('wear', 3, 'flirty', 'What do you most like seeing me wear?', 'What does {name} most like seeing you wear?', ['Something formal', 'Something casual', 'Something cosy', 'Their clothes on you', 'Something new'], 'Plan an occasion.'),
  q('time', 2, 'romantic', 'When do you feel most romantic?', 'When does {name} feel most romantic?', ['Early morning', 'Afternoons', 'Evenings', 'Late at night', 'On holiday'], 'Make time for it.'),
  q('bold', 4, 'bold', 'How bold would you like our next date night to be?', 'How bold would {name} like your next date night to be?', ['Sweet and slow', 'A little daring', 'Very daring', 'Surprise me', 'Let us decide together'], 'Agree on one detail.'),
  q('lead', 4, 'desires', 'Who would you like to take the lead next time?', 'Who would {name} like to take the lead next time?', ['Me', 'You', 'We take turns', 'Whoever starts it', 'Decide in the moment'], 'Talk about what that means.'),
  q('message', 3, 'flirty', 'Which message would make your day?', 'Which message would make {name}’s day?', ['“I can’t stop thinking about you”', '“Tonight?”', '“You looked amazing this morning”', 'A long love note', 'A voice note'], 'Send it.'),
  q('memory', 4, 'romantic', 'Which kind of memory with me do you revisit most?', 'Which kind of memory does {name} revisit most?', ['Our first kiss', 'A trip together', 'A night in', 'A big celebration', 'An ordinary day that felt special'], 'Tell the story.'),
  q('promise', 4, 'desires', 'What would make you feel most cherished this week?', 'What would make {name} feel most cherished this week?', ['Planning something for us', 'Words of love', 'Time without phones', 'Affection without asking', 'A surprise'], 'Make it happen.'),
];
