export type Category = 'romance' | 'chaotic' | 'understanding' | 'future';
export type Mode = 'quick' | 'standard' | 'full';
export type PlayerNumber = 1 | 2;
export type RoomStatus = 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
export type QuestionStatus = 'pending' | 'revealed' | 'skipped';

export interface RoomSettings {
  mode: Mode;
  rounds: Category[];
  per_round: number;
  question_count?: number;
}

export interface PlayerSummary {
  player_number: PlayerNumber;
  display_name: string;
  is_ready: boolean;
  is_host: boolean;
  last_seen_at: string;
}

export interface RoundBreakdown {
  category: Category;
  answered: number;
  matching: number;
  skipped: number;
}

export interface GameResults {
  questions_answered: number;
  questions_skipped: number;
  matching_answers: number;
  agreement_percentage: number;
  round_breakdown: RoundBreakdown[];
  completed_at: string;
}

export type RevealedAnswers = Partial<Record<'p1' | 'p2', PlayerNumber>>;

export interface CurrentQuestion {
  id: string;
  index: number;
  category: Category;
  question_text: string;
  status: QuestionStatus;
  my_answer: PlayerNumber | null;
  partner_submitted: boolean;
  my_skip_vote: boolean;
  partner_skip_vote: boolean;
  discussion_prompt: string | null;
  answers: RevealedAnswers | null;
}

export interface GameState {
  room: {
    id: string;
    invite_code: string;
    couple_name: string | null;
    status: RoomStatus;
    current_question_index: number;
    settings: RoomSettings;
    created_at: string;
    started_at: string | null;
    expires_at: string;
    completed_at: string | null;
    next_room_id: string | null;
    question_count: number;
  };
  me: { player_number: PlayerNumber; display_name: string; is_ready: boolean; is_host: boolean };
  players: PlayerSummary[];
  current: CurrentQuestion | null;
  results: GameResults | null;
  server_time: string;
}

export interface CompletedQuestion {
  index: number;
  category: Category;
  question_text: string;
  discussion_prompt: string | null;
  status: QuestionStatus;
  answers: RevealedAnswers | null;
}

export interface CompletedResults {
  room: {
    id: string;
    couple_name: string | null;
    settings: RoomSettings;
    started_at: string | null;
    completed_at: string;
    next_room_id: string | null;
  };
  players: { player_number: PlayerNumber; display_name: string; is_me: boolean }[];
  results: GameResults | null;
  questions: CompletedQuestion[];
}

export interface HistoryItem {
  room_id: string;
  couple_name: string | null;
  completed_at: string;
  mode: Mode;
  question_count: number;
  results: GameResults | null;
  players: { player_number: PlayerNumber; display_name: string }[];
}

// ---------------------------------------------------------------------
// Sessions (games 2-10)
// ---------------------------------------------------------------------
export type GameId =
  | 'likely'
  | 'know_me'
  | 'love_story'
  | 'after_hours'
  | 'future'
  | 'trust'
  | 'conflict'
  | 'quest'
  | 'mystery'
  | 'story'
  | 'after_dark'
  | 'velvet';

export type SessionGame = Exclude<GameId, 'likely'>;
export type SessionStatus = 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'expired';

export interface Entry<P = Record<string, unknown>> {
  key: string;
  player_number: PlayerNumber;
  payload: P;
  at: string;
}

export interface SessionView {
  session: {
    id: string;
    game: SessionGame;
    invite_code: string;
    title: string | null;
    status: SessionStatus;
    settings: Record<string, unknown>;
    state: Record<string, unknown>;
    state_version: number;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
    updated_at: string;
  };
  me: { player_number: PlayerNumber; is_host: boolean };
  players: PlayerSummary[];
  entries: Entry[];
  partner_pending: string[];
  server_time: string;
}

export interface DashboardSession {
  id: string;
  game: SessionGame;
  title: string | null;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  invite_code: string;
  mode: string | null;
  my_seat: PlayerNumber;
  players: { player_number: PlayerNumber; display_name: string }[] | null;
}

export interface DashboardRoom {
  id: string;
  title: string | null;
  status: RoomStatus;
  created_at: string;
  completed_at: string | null;
  invite_code: string;
  question_count: number;
  current_index: number;
  agreement: number | null;
  my_seat: PlayerNumber;
  players: { player_number: PlayerNumber; display_name: string }[] | null;
}

export interface Moment {
  id: string;
  game: string;
  title: string;
  body: string | null;
  created_at: string;
  session_id: string | null;
  room_id: string | null;
  mine: boolean;
}

export interface Dashboard {
  sessions: DashboardSession[];
  rooms: DashboardRoom[];
  moments: Moment[];
}

export interface MysteryView {
  case: { id: string; title: string; intro: string; ending: string | null };
  chapter: number;
  total_chapters: number;
  solved: boolean;
  chapters: {
    no: number;
    title: string;
    scene: string;
    question: string;
    options: { id: string; label: string }[];
    resolution: string | null;
    my_clues: { no: number; title: string; body: string }[];
    partner_clue_count: number;
    hints: string[];
    hints_available: number;
    attempts: number;
  }[];
}
