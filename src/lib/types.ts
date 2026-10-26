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
