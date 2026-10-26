import { AppError, toAppError } from './errors';
import { requireSupabase } from './supabase';
import type { Category, CompletedResults, Dashboard, GameState, HistoryItem, Mode, MysteryView, PlayerNumber, SessionGame, SessionView } from './types';

/** Single entry point for all server calls: typed, with errors normalised. */
async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await requireSupabase().rpc(fn, args);
  if (error) throw toAppError(error);
  return data as T;
}

export const api = {
  createRoom: (input: { displayName: string; coupleName?: string; mode: Mode; rounds: Category[] }) =>
    call<{ room_id: string; invite_code: string }>('create_room', {
      p_display_name: input.displayName,
      p_couple_name: input.coupleName || null,
      p_mode: input.mode,
      p_rounds: input.rounds,
    }),

  /** Joins either kind of game by its 8-character code. */
  async joinAny(code: string, displayName: string) {
    const res = await call<{ ok: boolean; error?: string; kind?: 'room' | 'session'; room_id?: string; session_id?: string; player_number?: PlayerNumber }>(
      'join_any',
      { p_invite_code: code, p_display_name: displayName },
    );
    if (!res.ok) throw new AppError(res.error ?? 'room_unavailable');
    return res.kind === 'room' ? { kind: 'room' as const, id: res.room_id! } : { kind: 'session' as const, id: res.session_id! };
  },

  getState: (roomId: string) => call<GameState>('get_game_state', { p_room_id: roomId }),
  setReady: (roomId: string, ready: boolean) => call('set_ready', { p_room_id: roomId, p_ready: ready }),
  updateName: (roomId: string, name: string) => call('update_display_name', { p_room_id: roomId, p_display_name: name }),
  startGame: (roomId: string) => call('start_game', { p_room_id: roomId }),
  submitAnswer: (roomId: string, gameQuestionId: string, choice: PlayerNumber) =>
    call<{ ok: boolean; duplicate: boolean; revealed: boolean }>('submit_answer', {
      p_room_id: roomId,
      p_game_question_id: gameQuestionId,
      p_selected_player_number: choice,
    }),
  revealQuestion: (roomId: string, gameQuestionId: string) =>
    call('reveal_question', { p_room_id: roomId, p_game_question_id: gameQuestionId }),
  voteSkip: (roomId: string, gameQuestionId: string, vote: boolean) =>
    call<{ ok: boolean; skipped: boolean }>('skip_question', {
      p_room_id: roomId,
      p_game_question_id: gameQuestionId,
      p_vote: vote,
    }),
  advance: (roomId: string, fromIndex: number) =>
    call<{ moved: boolean; completed: boolean }>('advance_question', { p_room_id: roomId, p_from_index: fromIndex }),
  completedResults: (roomId: string) => call<CompletedResults>('get_completed_results', { p_room_id: roomId }),
  history: () => call<HistoryItem[]>('get_history', { p_limit: 50 }),
  addRoomNote: (roomId: string, gameQuestionId: string, text: string) =>
    call('add_room_note', { p_room_id: roomId, p_game_question_id: gameQuestionId, p_text: text }),
  roomNotes: (roomId: string) => call<{ question_index: number; player_number: PlayerNumber; text: string }[]>('get_room_notes', { p_room_id: roomId }),
  deleteRoom: (roomId: string) => call('delete_game_session', { p_room_id: roomId }),
  cancelRoom: (roomId: string) => call('cancel_room', { p_room_id: roomId }),
  playAgain: (roomId: string) => call<{ room_id: string; created: boolean }>('play_again', { p_room_id: roomId }),

  // --- sessions (games 2-10) ---
  createSession: (game: SessionGame, displayName: string, settings: Record<string, unknown> = {}, title?: string) =>
    call<{ session_id: string; invite_code: string }>('create_session', {
      p_game: game,
      p_display_name: displayName,
      p_settings: settings,
      p_title: title || null,
    }),
  getSession: (id: string) => call<SessionView>('get_session', { p_session_id: id }),
  setSessionReady: (id: string, ready: boolean) => call('set_session_ready', { p_session_id: id, p_ready: ready }),
  startSession: (id: string) => call('start_session', { p_session_id: id }),
  submitEntry: (id: string, key: string, payload: Record<string, unknown>) =>
    call<{ ok: boolean; duplicate: boolean }>('submit_entry', { p_session_id: id, p_key: key, p_payload: payload }),
  deleteEntry: (id: string, key: string) => call('delete_entry', { p_session_id: id, p_key: key }),
  updateState: (id: string, patch: Record<string, unknown>, expectedVersion: number) =>
    call<{ ok: boolean; conflict?: boolean; version: number }>('update_session_state', {
      p_session_id: id,
      p_patch: patch,
      p_expected_version: expectedVersion,
    }),
  completeSession: (id: string, title?: string) => call('complete_session', { p_session_id: id, p_title: title ?? null }),
  renameSession: (id: string, title: string) => call('rename_session', { p_session_id: id, p_title: title }),
  cancelSession: (id: string) => call('cancel_session', { p_session_id: id }),
  deleteSession: (id: string) => call('delete_session', { p_session_id: id }),
  dashboard: () => call<Dashboard>('get_dashboard'),
  saveMoment: (input: { game: string; title: string; body?: string; sessionId?: string; roomId?: string }) =>
    call<{ ok: boolean; id: string }>('save_moment', {
      p_game: input.game,
      p_title: input.title,
      p_body: input.body ?? null,
      p_session_id: input.sessionId ?? null,
      p_room_id: input.roomId ?? null,
    }),
  deleteMoment: (id: string) => call('delete_moment', { p_moment_id: id }),
  mystery: (id: string) => call<MysteryView>('get_mystery', { p_session_id: id }),
  mysteryHint: (id: string) => call<{ ok: boolean; error?: string }>('mystery_hint', { p_session_id: id }),
  mysteryAnswer: (id: string, optionId: string) =>
    call<{ ok: boolean; correct: boolean; solved: boolean }>('mystery_answer', { p_session_id: id, p_option_id: optionId }),
  afterDarkTerms: (id: string) => call<import('../games/after-dark/content/taxonomy').Terms>('after_dark_terms', { p_session_id: id }),
};
