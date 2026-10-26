import { useEffect, useRef, useState } from 'react';
import { TextAnswer } from '../session/Parts';
import { Check, Heart, Lock, MessagesSquare, SkipForward } from 'lucide-react';
import { Avatar, seatTone } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { api } from '../../lib/api';
import { toAppError } from '../../lib/errors';
import { didMatch, revealInterpretation, roundTitle } from '../../lib/game';
import type { GameState, PlayerNumber } from '../../lib/types';

function Progress({ index, total, round }: { index: number; total: number; round: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-ink-soft">{round}</span>
        <span className="tabular text-ink-mute">
          {index + 1} / {total}
        </span>
      </div>
      <div
        className="mt-2.5 h-[3px] overflow-hidden rounded-[2px] bg-line"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index + 1}
        aria-label={`Question ${index + 1} of ${total}`}
      >
        <div className="h-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${((index + 1) / total) * 100}%` }} />
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

  useEffect(() => {
    const prev = lastSeen.current;
    if (!prev || prev.id !== q.id) {
      setChoice(null);
      setJustRevealed(false);
      if (prev) headingRef.current?.focus();
    } else if (prev.status === 'pending' && q.status === 'revealed') {
      setJustRevealed(true);
    }
    lastSeen.current = { id: q.id, status: q.status };
  }, [q.id, q.status]);

  async function act(kind: 'submit' | 'skip' | 'next', fn: () => Promise<unknown>) {
    if (busy) return;
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
  const interactive = !submitted && !revealed && !skipped && !q.my_skip_vote;

  // Optional explanations, available only after the reveal.
  const [notes, setNotes] = useState<{ question_index: number; player_number: PlayerNumber; text: string }[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  useEffect(() => {
    if (!revealed) return;
    let live = true;
    api.roomNotes(state.room.id).then((n) => live && setNotes(n)).catch(() => {});
    return () => {
      live = false;
    };
  }, [revealed, q.id, state.room.id, state.server_time]);
  useEffect(() => setNoteDraft(''), [q.id]);
  const questionNotes = notes.filter((n) => n.question_index === q.index);
  const myNote = questionNotes.find((n) => n.player_number === me);

  const votersFor = (seat: PlayerNumber): PlayerNumber[] =>
    revealed && q.answers ? ([1, 2] as PlayerNumber[]).filter((v) => q.answers?.[`p${v}`] === seat) : [];

  const next = (
    <Button size="lg" block loading={busy === 'next'} onClick={() => act('next', () => api.advance(state.room.id, q.index))}>
      {isLast ? 'See results' : 'Next question'}
    </Button>
  );

  return (
    <div>
      <Progress index={q.index} total={state.room.question_count} round={roundTitle(q.category)} />

      <h1
        id="question"
        ref={headingRef}
        tabIndex={-1}
        className="mt-8 text-[1.75rem] leading-[1.18] font-semibold tracking-[-0.03em] text-balance outline-none sm:text-[2.2rem]"
      >
        {q.question_text}
      </h1>

      <div className="mt-7 space-y-2.5" role="radiogroup" aria-labelledby="question">
        {([1, 2] as PlayerNumber[]).map((seat) => {
          const tone = seatTone[seat];
          const mine = submitted && q.my_answer === seat && !revealed;
          const selected = (interactive && choice === seat) || mine;
          const voters = votersFor(seat);
          const highlighted = selected || voters.length > 0;
          return (
            <button
              key={seat}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!interactive}
              onClick={() => setChoice(seat)}
              className={`flex w-full items-center gap-3.5 rounded-[10px] px-4 py-3.5 text-left transition-[box-shadow,background-color] duration-150 sm:px-5 sm:py-4 ${
                highlighted ? `${tone.soft} shadow-[inset_0_0_0_1.5px_currentColor] ${seat === 1 ? 'text-rose' : 'text-lilac'}` : 'bg-white shadow-[inset_0_0_0_1px_var(--color-line-strong)]'
              } ${interactive ? 'cursor-pointer hover:shadow-[inset_0_0_0_1px_var(--color-ink-mute)]' : 'cursor-default'} ${
                skipped ? 'opacity-50' : ''
              }`}
            >
              <Avatar name={names[seat]} seat={seat} size="lg" />
              <span className="min-w-0 flex-1 text-ink">
                <span className="block truncate text-[1.05rem] font-semibold">{names[seat]}</span>
                <span className="block text-sm text-ink-mute">{seat === me ? 'You' : 'Your partner'}</span>
              </span>

              {voters.length > 0 ? (
                <span className="flex items-center gap-1.5">
                  {voters.map((v, i) => (
                    <span
                      key={v}
                      className={justRevealed ? 'animate-land' : ''}
                      style={justRevealed ? { animationDelay: `${150 + i * 180}ms` } : undefined}
                      title={v === me ? 'Your pick' : `${names[v]}'s pick`}
                    >
                      <Avatar name={names[v]} seat={v} size="sm" className="rounded-full ring-2 ring-white" />
                    </span>
                  ))}
                  <span className="sr-only">
                    picked by {voters.map((v) => (v === me ? 'you' : names[v])).join(' and ')}
                  </span>
                </span>
              ) : (
                !revealed &&
                !skipped && (
                  <span
                    className={`grid size-5 shrink-0 place-items-center rounded-full ${
                      selected ? `${tone.dot} text-white` : 'shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]'
                    }`}
                    aria-hidden="true"
                  >
                    {selected && (mine ? <Lock className="size-2.5" strokeWidth={3} /> : <Check className="size-3" strokeWidth={3.5} />)}
                  </span>
                )
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6" aria-live="polite">
        {revealed && q.answers && (
          <div className="animate-rise space-y-5">
            <div className="rounded-[10px] bg-white p-5 shadow-hairline">
              <p className="flex items-center gap-2 font-semibold">
                {matched ? (
                  <Heart className={`size-4.5 fill-rose text-rose ${justRevealed ? 'animate-land' : ''}`} aria-hidden="true" />
                ) : (
                  <MessagesSquare className="size-4.5 text-lilac" aria-hidden="true" />
                )}
                {matched ? 'You agreed on this one.' : 'You saw this differently.'}
              </p>
              <p className="mt-1 text-ink-soft">{revealInterpretation(q.answers, names, q.index)}</p>
              {q.discussion_prompt && (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="text-sm font-medium text-ink-mute">Talk about it</p>
                  <p className="mt-0.5 text-ink">{q.discussion_prompt}</p>
                </div>
              )}
            </div>
            {questionNotes.length > 0 && (
              <ul className="space-y-2">
                {questionNotes.map((n) => (
                  <li key={n.player_number} className="flex gap-2.5 rounded-[6px] bg-mist px-3.5 py-3 text-sm shadow-hairline">
                    <Avatar name={names[n.player_number]} seat={n.player_number} size="xs" />
                    <span>
                      <span className="font-medium">{n.player_number === me ? 'You' : names[n.player_number]}: </span>
                      {n.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {!myNote && (
              <div className="space-y-2">
                <TextAnswer label="Explain your pick" value={noteDraft} onChange={setNoteDraft} max={300} rows={2} placeholder="Explain your pick (optional)" />
                {noteDraft.trim() && (
                  <Button size="sm" variant="secondary" loading={busy === 'skip'} onClick={() => act('skip', async () => {
                    await api.addRoomNote(state.room.id, q.id, noteDraft.trim());
                    setNotes(await api.roomNotes(state.room.id));
                  })}>
                    Share explanation
                  </Button>
                )}
              </div>
            )}
            {next}
          </div>
        )}

        {skipped && (
          <div className="animate-rise space-y-5">
            <p className="rounded-[10px] bg-mist p-5 text-ink-soft shadow-hairline">You both skipped this one. It won't count towards your score.</p>
            {next}
          </div>
        )}

        {!revealed && !skipped && (
          <div className="space-y-4">
            {q.partner_skip_vote && !q.my_skip_vote && (
              <div className="flex items-center gap-3 rounded-[10px] bg-lavender-soft py-2.5 pr-2.5 pl-4">
                <p className="flex-1 text-sm text-ink">{partnerName} wants to skip this question.</p>
                <Button size="sm" variant="secondary" loading={busy === 'skip'} onClick={() => act('skip', () => api.voteSkip(state.room.id, q.id, true))}>
                  Skip it
                </Button>
              </div>
            )}

            {submitted ? (
              <div className="flex items-center gap-3.5 rounded-[10px] bg-mist px-5 py-4 shadow-hairline">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-white">
                  <Lock className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">Answer locked in</p>
                  <p className="flex items-center gap-2 text-sm text-ink-soft">
                    <span className="size-1.5 animate-pulse-soft rounded-full bg-accent" aria-hidden="true" />
                    {q.partner_submitted ? 'Revealing now' : `Waiting for ${partnerName}`}
                  </p>
                </div>
              </div>
            ) : q.my_skip_vote ? (
              <div className="flex items-center gap-3 rounded-[10px] bg-mist px-5 py-4 shadow-hairline">
                <p className="flex-1 text-sm text-ink-soft">You asked to skip. It's skipped if {partnerName} agrees.</p>
                <Button size="sm" variant="secondary" loading={busy === 'skip'} onClick={() => act('skip', () => api.voteSkip(state.room.id, q.id, false))}>
                  Answer instead
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
                  {!q.partner_skip_vote && (
                    <Button
                      size="lg"
                      variant="ghost"
                      icon={<SkipForward className="size-4" aria-hidden="true" />}
                      loading={busy === 'skip'}
                      onClick={() => act('skip', () => api.voteSkip(state.room.id, q.id, true))}
                      className="sm:w-auto"
                    >
                      Skip
                    </Button>
                  )}
                  <Button
                    size="lg"
                    block
                    disabled={choice === null}
                    loading={busy === 'submit'}
                    onClick={() => choice && act('submit', () => api.submitAnswer(state.room.id, q.id, choice))}
                    className="sm:flex-1"
                  >
                    Lock in answer
                  </Button>
                </div>
                <p className="text-center text-sm text-ink-mute">
                  {q.partner_submitted
                    ? `${partnerName} has answered. Both answers appear once you lock in.`
                    : `${partnerName} won't see your answer until you've both locked in.`}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
