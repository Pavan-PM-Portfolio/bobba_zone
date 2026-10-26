import { CalendarHeart, Flame, Gem, ListChecks, Dices, GitCompareArrows, Layers, MessageSquareLock, Spade, TrendingUp, Disc3, type LucideIcon } from 'lucide-react';

export type ModeId = 'velvet' | 'mcq' | 'desire' | 'truth_dare' | 'pick_one' | 'desires' | 'ladder' | 'roulette' | 'knows' | 'date' | 'wild';

export const MODES: { id: ModeId; title: string; description: string; format: string; icon: LucideIcon }[] = [
  { id: 'mcq', title: 'The Question Game', description: 'Scenarios and deep questions with four answers each. Choose in private, lock in, reveal together.', format: 'Simultaneous', icon: ListChecks },
  { id: 'desire', title: 'Desire Mode', description: 'Turn-ons, touch, kinks, fantasies and secret curiosities. Private answers, revealed together, only on topics you both opt into.', format: 'Simultaneous', icon: Flame },
  { id: 'truth_dare', title: 'Truth or Dare', description: 'Take turns choosing. Every few rounds you both answer the same truth.', format: 'Take turns', icon: Spade },
  { id: 'pick_one', title: 'Pick One', description: 'Two options, chosen in private, revealed together.', format: 'Simultaneous', icon: GitCompareArrows },
  { id: 'desires', title: 'Secret Desires', description: 'Personal prompts. You decide whether each answer is shared now, after you both answer, or kept private.', format: 'Private first', icon: MessageSquareLock },
  { id: 'ladder', title: 'The Heat Ladder', description: 'Five rounds that build slowly. You only climb when you both say so.', format: 'Progressive', icon: TrendingUp },
  { id: 'roulette', title: 'Dare Roulette', description: 'Spin for a challenge from the categories you both chose. Skip or reroll freely.', format: 'Together', icon: Disc3 },
  { id: 'knows', title: 'Who Knows Whom Better?', description: 'One answers about themselves, the other predicts. Then swap.', format: 'Take turns', icon: Dices },
  { id: 'date', title: 'Fantasy Date Builder', description: 'Both design a date in private, then combine them into one plan.', format: 'Simultaneous', icon: CalendarHeart },
  { id: 'wild', title: 'Wildcards', description: 'A big deck of questions, choices, scenarios and challenges. Draw, skip, reshuffle.', format: 'Together', icon: Layers },
];

/** VELVET is its own game, rendered by the same shell. */
export const VELVET_MODE = { id: 'velvet' as ModeId, title: 'VELVET: Body & Desire', description: 'Tap-only adult preference game.', format: 'Simultaneous', icon: Gem };

export const modeById = (id: string) => (id === 'velvet' ? VELVET_MODE : (MODES.find((m) => m.id === id) ?? MODES[0]!));
