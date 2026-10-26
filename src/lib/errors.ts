/** Maps server error codes (raised by the RPCs) to friendly, actionable copy. */
const MESSAGES: Record<string, string> = {
  not_authenticated: 'Your session ended. Sign in again to continue.',
  account_required: 'Sign in with your account to play.',
  invalid_name: 'Names need 1 to 30 characters.',
  invalid_mode: 'Choose a game length.',
  invalid_rounds: 'Choose at least one round.',
  invalid_input: 'Something in that request was not valid. Try again.',
  invalid_choice: 'Pick one of the two names.',
  rate_limited: 'Too many attempts. Wait a few minutes, then try again.',
  room_unavailable: "That code doesn't match an open game. It may have expired, already started or be full.",
  room_not_found: "This game doesn't exist or you aren't one of its players.",
  room_expired: 'This game expired after a day without activity. Start a new one.',
  room_not_waiting: 'The game has already started.',
  room_not_active: 'This game is no longer active.',
  host_only: 'Only the person who created the game can do that.',
  waiting_for_partner: 'Your partner still needs to join.',
  players_not_ready: 'Both of you need to tap Ready first.',
  game_not_in_progress: "The game isn't running right now.",
  game_not_completed: "This game hasn't finished yet.",
  question_not_found: 'That question is not part of this game.',
  question_not_current: 'The game has moved on to another question.',
  question_closed: 'This question has already been revealed.',
  question_not_revealed: 'You can explain your pick once both answers are revealed.',
  question_not_finished: 'Both of you need to answer (or agree to skip) first.',
  already_submitted: 'Your answer is already locked in.',
  no_questions: 'No questions are available for those rounds right now.',
  try_again: 'Something went wrong creating the game. Try again.',
  session_not_found: "This game doesn't exist or you aren't one of its players.",
  session_not_active: 'This game has ended.',
  session_expired: 'This game expired after 30 days without activity.',
  invalid_game: "That game isn't available.",
  not_found: 'That item no longer exists.',
};

export class AppError extends Error {
  constructor(
    public code: string,
    message?: string,
  ) {
    super(message ?? MESSAGES[code] ?? 'Something went wrong. Check your connection and try again.');
    this.name = 'AppError';
  }
}

export function messageFor(code: string): string {
  return MESSAGES[code] ?? 'Something went wrong. Check your connection and try again.';
}

/** Normalise anything thrown (PostgREST error, network error, AppError). */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const raw = (err as { message?: string } | null)?.message ?? String(err ?? '');
  const code = Object.keys(MESSAGES).find((k) => raw === k || raw.includes(k));
  if (code) return new AppError(code);
  if (/fetch|network|Failed to fetch|NetworkError/i.test(raw)) {
    return new AppError('network', "You seem to be offline. We'll keep trying to reconnect.");
  }
  return new AppError('unknown');
}
