import {
  BookHeart,
  Compass,
  Feather,
  Flame,
  Handshake,
  Map,
  MessageCircleQuestion,
  MoonStar,
  Scale,
  Search,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { GameId } from '../lib/types';

export type GameFormat = 'Simultaneous' | 'Take turns' | 'Together' | 'Cooperative';

export interface GameDef {
  id: GameId;
  title: string;
  tagline: string;
  description: string;
  format: GameFormat;
  duration: string;
  icon: LucideIcon;
  /** Card identity: soft background + strong foreground. */
  tint: { bg: string; fg: string };
}

export const GAMES: GameDef[] = [
  {
    id: 'likely',
    title: 'Who Is More Likely To?',
    tagline: 'Point at each other, honestly.',
    description: 'You both pick who is more likely to do something, in private. Answers appear together.',
    format: 'Simultaneous',
    duration: '10-45 min',
    icon: UsersRound,
    tint: { bg: '#FBE2E9', fg: '#9F345B' },
  },
  {
    id: 'know_me',
    title: 'How Well Do You Know Me?',
    tagline: 'One answers, one predicts.',
    description: 'Take turns answering about yourself while your partner predicts what you said.',
    format: 'Take turns',
    duration: '25-50 min',
    icon: MessageCircleQuestion,
    tint: { bg: '#ECE6F5', fg: '#5A4785' },
  },
  {
    id: 'love_story',
    title: 'Our Love Story',
    tagline: 'Two memories of the same moments.',
    description: 'Write your side of first impressions, dates and turning points, then build a shared timeline.',
    format: 'Simultaneous',
    duration: '30-60 min',
    icon: BookHeart,
    tint: { bg: '#F8E7DD', fg: '#94513A' },
  },
  {
    id: 'after_hours',
    title: 'After Hours',
    tagline: 'Closer, at your own pace.',
    description: 'Romantic and intimate prompts at a comfort level you both agree on. Reveal only with consent.',
    format: 'Simultaneous',
    duration: '20-45 min',
    icon: MoonStar,
    tint: { bg: '#E6E4F0', fg: '#3B3561' },
  },
  {
    id: 'future',
    title: 'Future Together',
    tagline: 'Where you are heading, side by side.',
    description: 'Choose independently on travel, money, home and more, and mark what matters most.',
    format: 'Simultaneous',
    duration: '30-50 min',
    icon: Compass,
    tint: { bg: '#E3EFE8', fg: '#2F6B4F' },
  },
  {
    id: 'trust',
    title: 'Trust & Boundaries',
    tagline: 'Real situations, your own words.',
    description: 'Everyday scenarios about privacy, friends and expectations, with prompts to talk them through.',
    format: 'Simultaneous',
    duration: '30-45 min',
    icon: Handshake,
    tint: { bg: '#E3ECF3', fg: '#345C7A' },
  },
  {
    id: 'conflict',
    title: 'Conflict Simulator',
    tagline: 'Practise the hard moments.',
    description: 'Fictional disagreements. You each choose how you would respond, then reflect together.',
    format: 'Simultaneous',
    duration: '30-50 min',
    icon: Scale,
    tint: { bg: '#F6ECD9', fg: '#8A5A14' },
  },
  {
    id: 'quest',
    title: 'Romance Quest',
    tagline: 'A journey of small adventures.',
    description: 'Pick challenges that fit your budget and time, add ideas together and tick them off.',
    format: 'Together',
    duration: 'Play over weeks',
    icon: Map,
    tint: { bg: '#FBE4DF', fg: '#A3402E' },
  },
  {
    id: 'mystery',
    title: "The Couple's Mystery",
    tagline: 'Half the clues each.',
    description: 'Solve an original mystery chapter by chapter. Neither of you can crack it alone.',
    format: 'Cooperative',
    duration: '30-60 min',
    icon: Search,
    tint: { bg: '#ECEAEA', fg: '#3E3A3F' },
  },
  {
    id: 'story',
    title: 'Story Roulette for Two',
    tagline: 'Write a story, one choice at a time.',
    description: 'Take turns choosing characters, places, twists and endings, then read your story together.',
    format: 'Take turns',
    duration: '20-40 min',
    icon: Feather,
    tint: { bg: '#F3E1EA', fg: '#7A2F55' },
  },
  {
    id: 'after_dark',
    title: 'After Dark',
    tagline: 'Private, 18+, at your own pace.',
    description: 'Truth or dare, secret desires, a heat ladder and more. Only what you both agree to is ever shown.',
    format: 'Simultaneous',
    duration: '20-90 min',
    icon: Flame,
    tint: { bg: '#F6DCE5', fg: '#8E2B52' },
  },
];

/** Where a game card leads. */
export const gameHref = (id: string) => (id === 'likely' ? '/create' : id === 'after_dark' ? '/after-dark' : `/new/${id}`);

export const gameById = (id: string): GameDef | undefined => GAMES.find((g) => g.id === id);

export function GameGlyph({ game, size = 'md' }: { game: GameDef; size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'lg' ? 'size-12' : size === 'sm' ? 'size-8' : 'size-10';
  const icon = size === 'lg' ? 'size-6' : size === 'sm' ? 'size-4' : 'size-5';
  const Icon = game.icon;
  return (
    <span className={`grid ${box} shrink-0 place-items-center rounded-[8px]`} style={{ background: game.tint.bg, color: game.tint.fg }} aria-hidden="true">
      <Icon className={icon} strokeWidth={1.8} />
    </span>
  );
}
