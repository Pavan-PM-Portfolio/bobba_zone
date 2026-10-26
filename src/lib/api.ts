import { AppError, toAppError } from './errors';
import { requireSupabase } from './supabase';
import type { Category, CompletedResults, GameState, HistoryItem, Mode, PlayerNumber } from './types';

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

  async joinRoom(code: string, displayName: string) {
    const res = await call<{ ok: boolean; error?: string; room_id?: string; player_number?: PlayerNumber; rejoined?: boolean }>(
      'join_room',
      { p_invite_code: code, p_display_name: displayName },
    );
    if (!res.ok) throw new AppError(res.error ?? 'room_unavailable');
    return res as { room_id: string; player_number: PlayerNumber; rejoined: boolean };
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
  deleteSession: (roomId: string) => call('delete_game_session', { p_room_id: roomId }),
  cancelRoom: (roomId: string) => call('cancel_room', { p_room_id: roomId }),
  playAgain: (roomId: string) => call<{ room_id: string; created: boolean }>('play_again', { p_room_id: roomId }),
};
