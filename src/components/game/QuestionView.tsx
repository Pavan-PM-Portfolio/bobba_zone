import { useEffect, useRef, useState } from 'react';
import { Heart, Lock, MessageCircleHeart, SkipForward } from 'lucide-react';
import { Avatar, seatTone } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { HeartBurst } from '../ui/Celebrate';
import { useToast } from '../ui/Toast';
import { api } from '../../lib/api';
import { toAppError } from '../../lib/errors';
import { didMatch, revealInterpretation, roundTitle } from '../../lib/game';
import type { GameState, PlayerNumber } from '../../lib/types';

function Progress({ index, total }: { index: number; total: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">
          Question {index + 1} of {total}
        </span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index + 1}
        aria-label="Game progress"
      >
        <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
    </div>
  );
}

export function QuestionView({ state, refresh }: { state: GameState; refresh: () => Promise<void> }) {
  const toast = useToast();
  const q = state.current!;
  const me = state.me.player_number;
  const partnerSeat: PlayerNumber = me === 1 ? 2 : 1;
  const names: Record<PlayerNumber, string> = {
    1: state.players.find((p) => p.player_number === 1)?.display_name ?? 'Player 1',
    2: state.players.find((p) => p.player_number === 2)?.display_name ?? 'Player 2',
  };
  const partnerName = names[partnerSeat];

  const [choice, setChoice] = useState<PlayerNumber | null>(null);
  const [busy, setBusy] = useState<null | 'submit' | 'skip' | 'next'>(null);
  const [justRevealed, setJustRevealed] = useState(false);
  const lastSeen = useRef<{ id: string; status: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Reset local selection on a new question; detect the live reveal moment.
  useEffect(() => {
    const prev = lastSeen.current;
    if (!prev || prev.id !== q.id) {
      setChoice(null);
      setJustRevealed(false);
      headingRef.current?.focus();
    } else if (prev.status === 'pending' && q.status === 'revealed') {
      setJustRevealed(true);
    }
    lastSeen.current = { id: q.id, status: q.status };
  }, [q.id, q.status]);

  async function act(kind: 'submit' | 'skip' | 'next', fn: () => Promise<unknown>) {
    if (busy) return; // guards double taps
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      const err = toAppError(e);
      if (!['already_submitted', 'question_closed', 'question_not_current'].includes(err.code)) toast(err.message, 'error');
    } finally {
      await refresh();
      setBusy(null);
    }
  }

  const submitted = q.my_answer !== null;
  const revealed = q.status === 'revealed';
  const skipped = q.status === 'skipped';
  const matched = didMatch(q.answers);
  const isLast = q.index + 1 >= state.room.question_count;

  const picksFor = (seat: PlayerNumber): PlayerNumber[] => {
    if (!revealed || !q.answers) return [];
    return ([1, 2] as PlayerNumber[]).filter((voter) => q.answers?.[`p${voter}`] === seat);
  };

  return (
    <div className="space-y-6">
      <Progress index={q.index} total={state.room.question_count} />

      <section aria-labelledby="question" className="relative">
        <p className="text-[0.95rem] font-semibold text-lilac-deep">{roundTitle(q.category)}</p>
        <h1
          id="question"
          ref={headingRef}
          tabIndex={-1}
          className="mt-2 font-display text-[2rem] leading-[1.12] text-balance outline-none sm:text-[2.6rem]"
        >
          {q.question_text}
        </h1>
      </section>

      {/* The two choices */}
      <div className="relative grid grid-cols-2 gap-3 sm:gap-4" role="radiogroup" aria-label="Choose who is more likely">
        {([1, 2] as PlayerNumber[]).map((seat) => {
          const tone = seatTone[seat];
          const selected = revealed ? false : submitted ? q.my_answer === seat : choice === seat;
          const voters = picksFor(seat);
          const interactive = !submitted && !revealed && !skipped;
          return (
            <button
              key={seat}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!interactive}
              onClick={() => setChoice(seat)}
              className={`relative flex min-h-44 flex-col items-start rounded-[28px] p-4 text-left transition-[box-shadow,background,transform] duration-200 sm:min-h-52 sm:p-5 ${
                selected
                  ? `${tone.soft} ring-[3px] ${tone.ring} shadow-lift`
                  : voters.length
                    ? `${tone.soft} ring-1 ring-line`
                    : 'bg-white ring-1 ring-line shadow-[0_1px_2px_rgb(28_33_71/0.05)]'
              } ${interactive ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lift' : 'cursor-default'} ${
                skipped ? 'opacity-50' : ''
              }`}
            >
              <Avatar name={names[seat]} seat={seat} size="lg" />
              <span className="mt-3 block text-lg font-semibold leading-tight break-words">{names[seat]}</span>
              <span className="text-sm text-ink-mute">{seat === me ? 'You' : 'Your partner'}</span>
              {voters.length > 0 && (
                <span className="mt-auto flex flex-wrap gap-1.5 pt-3">
                  {voters.map((v, i) => (
                    <span
                      key={v}
                      className={`inline-flex h-7 items-center gap-1.5 rounded-full bg-white pr-2.5 pl-0.5 text-[0.8rem] font-semibold ring-1 ring-line ${
                        justRevealed ? 'animate-pop' : ''
                      }`}
                      style={justRevealed ? { animationDelay: `${120 + i * 160}ms` } : undefined}
                    >
                      <Avatar name={names[v]} seat={v} size="sm" className="scale-[0.8]" />
                      {v === me ? 'Your pick' : `${names[v]}'s pick`}
                    </span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
        {revealed && matched && justRevealed && <HeartBurst />}
      </div>

      {/* Action area */}
      <div aria-live="polite">
        {skipped && (
          <div className="animate-rise space-y-4">
            <p className="rounded-2xl bg-shell px-4 py-3 text-ink-soft">You both chose to skip this one. It won't count towards your score.</p>
            <Button size="lg" block loading={busy === 'next'} onClick={() => act('next', () => api.advance(state.room.id, q.index))}>
              {isLast ? 'See our results' : 'Next question'}
            </Button>
          </div>
        )}

        {revealed && q.answers && (
          <div className="animate-rise space-y-4">
            <div className={`rounded-[24px] p-5 ${matched ? 'bg-blush-soft' : 'bg-lavender-soft'}`}>
              <p className={`flex items-center gap-2 font-semibold ${matched ? 'text-rose-deep' : 'text-lilac-deep'}`}>
                {matched ? <Heart className="size-5 fill-current" aria-hidden="true" /> : <MessageCircleHeart className="size-5" aria-hidden="true" />}
                {matched ? 'You agree' : 'Different views'}
              </p>
              <p className="mt-1.5 text-ink">{revealInterpretation(q.answers, names, q.index)}</p>
              {q.discussion_prompt && (
                <p className="mt-4 border-t border-ink/10 pt-4 text-ink-soft">
                  <span className="font-semibold text-ink">Talk about it: </span>
                  {q.discussion_prompt}
                </p>
              )}
            </div>
            <Button size="lg" block loading={busy === 'next'} onClick={() => act('next', () => api.advance(state.room.id, q.index))}>
              {isLast ? 'See our results' : 'Next question'}
            </Button>
          </div>
        )}

        {!revealed && !skipped && (
          <div className="space-y-4">
            {q.partner_skip_vote && !q.my_skip_vote && (
              <div className="flex flex-col gap-3 rounded-2xl bg-lavender-soft p-4 sm:flex-row sm:items-center">
                <p className="flex-1 text-ink">{partnerName} would like to skip this question.</p>
                <Button variant="secondary" loading={busy === 'skip'} onClick={() => act('skip', () => api.voteSkip(state.room.id, q.id, true))}>
                  Skip it too
                </Button>
              </div>
            )}

            {submitted ? (
              <div className="flex flex-col items-center rounded-[28px] bg-white px-5 py-7 text-center ring-1 ring-line">
                <span className="grid size-14 place-items-center rounded-full bg-blush-soft text-rose">
                  <Heart className="size-7 animate-breathe fill-current" aria-hidden="true" />
                </span>
                <p className="mt-4 font-display text-2xl">Your answer is locked in.</p>
                <p className="mt-1 text-ink-soft">
                  {q.partner_submitted ? 'Revealing now…' : `Waiting for ${partnerName} ❤️`}
                </p>
              </div>
            ) : q.my_skip_vote ? (
              <div className="rounded-[28px] bg-white px-5 py-6 text-center ring-1 ring-line">
                <p className="font-semibold">You asked to skip this question.</p>
                <p className="mt-1 text-ink-soft">It's skipped only if {partnerName} agrees.</p>
                <Button
                  variant="ghost"
                  className="mt-3"
                  loading={busy === 'skip'}
                  onClick={() => act('skip', () => api.voteSkip(state.room.id, q.id, false))}
                >
                  Answer it instead
                </Button>
              </div>
            ) : (
              <>
                <Button
                  size="lg"
                  block
                  disabled={choice === null}
                  loading={busy === 'submit'}
                  icon={<Lock className="size-4" aria-hidden="true" />}
                  onClick={() => choice && act('submit', () => api.submitAnswer(state.room.id, q.id, choice))}
                >
                  {choice ? `Lock in ${names[choice]}` : 'Pick a name to answer'}
                </Button>
                <p className="text-center text-sm text-ink-mute">
                  {q.partner_submitted ? `${partnerName} has answered. Your choices stay hidden until you both lock in.` : `${partnerName} won't see your choice until you both answer.`}
                </p>
              </>
            )}

            {!q.my_skip_vote && !q.partner_skip_vote && (
              <div className="text-center">
                <Button
                  variant="ghost"
                  icon={<SkipForward className="size-4" aria-hidden="true" />}
                  loading={busy === 'skip'}
                  onClick={() => act('skip', () => api.voteSkip(state.room.id, q.id, true))}
                >
                  Ask to skip this one
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
