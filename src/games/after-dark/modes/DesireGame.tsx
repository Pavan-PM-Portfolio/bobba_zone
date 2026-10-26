import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Check, ChevronDown, EyeOff, LockKeyhole, MessageCircleMore, SkipForward } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Avatar, seatTone } from '../../../components/ui/Avatar';
import { Note, StepProgress, TextAnswer, Waiting } from '../../../components/session/Parts';
import { entriesFor, entriesWithPrefix, partnerHasPending, seatNames } from '../../../hooks/useSession';
import { seededShuffle } from '../../../lib/random';
import type { PlayerNumber, SessionView } from '../../../lib/types';
import { useBusy, useDraft, useJustRevealed } from '../../flow';
import type { SessionApi } from '../../types';
import type { ModeProps } from '../AfterDark';
import {
  DESIRE_CATS,
  LADDER,
  OPEN,
  catTitle,
  desireById,
  desirePool,
  pairVerdict,
  toggleDesire,
  validDesire,
  verdictText,
  type DesireCat,
  type DesireQ,
} from '../content/desire';
import { Recap, RecapList } from '../Recap';

/**
 * Desire Mode.
 *
 * Entries (server-enforced visibility):
 *   seal:x<i>   an answer, hidden until both players have one, then immutable
 *   pub:xs<i>   a secret answer its author chose to show immediately
 *   priv:x<i>   a secret answer kept private: only its author can ever read it
 *   pub:xd<i>   "I have answered" marker for secret rounds: {share}, never the answer
 *   pub:f<i>    an optional follow-up answer, shared on purpose
 *   pub:later<i>, pub:st<n>e<epoch>  bookmarks and ladder opt-ins
 *
 * Shared state: step, qs[i] (question drawn once per step), skipped[],
 * and for the ladder: stage (0 until both opt into step 1), stageStart, epoch.
 */
type Answer = { id: string; picks: string[]; note?: string; intent?: Intent };
type Share = 'together' | 'now' | 'private';
type Intent = 'discuss' | 'someday' | 'keep';
type FollowUp = { prompt: string; text: string };

const SHARES: { id: Share; title: string; detail: string }[] = [
  { id: 'together', title: 'Reveal after we both answer', detail: 'Only if your partner shares theirs too.' },
  { id: 'now', title: 'Reveal to my partner now', detail: 'They can see it straight away.' },
  { id: 'private', title: 'Keep private', detail: 'Only you will ever see this answer.' },
];
const INTENTS: { id: Intent; title: string }[] = [
  { id: 'discuss', title: 'I would like to discuss it' },
  { id: 'someday', title: 'Maybe explore it someday' },
  { id: 'keep', title: 'Just a private curiosity' },
];
const ALL_CATS = DESIRE_CATS.map((c) => c.id);
const other = (p: PlayerNumber): PlayerNumber => (p === 1 ? 2 : 1);
const answererFor = (i: number): PlayerNumber => (i % 2 === 0 ? 1 : 2);

interface GameState {
  step: number;
  qs: string[];
  skipped: number[];
  stage: number;
  stageStart: number;
  epoch: number;
}

function readState(raw: Record<string, unknown>): GameState {
  return {
    step: Number(raw.step ?? 0),
    qs: Array.isArray(raw.qs) ? (raw.qs as string[]) : [],
    skipped: Array.isArray(raw.skipped) ? (raw.skipped as number[]) : [],
    stage: Number(raw.stage ?? 0),
    stageStart: Number(raw.stageStart ?? 0),
    epoch: Number(raw.epoch ?? 0),
  };
}

function readSettings(view: SessionView) {
  const raw = view.session.settings;
  const ladder = raw.style === 'ladder';
  const rounds = Math.min(40, Math.max(4, Number(raw.rounds ?? 15) || 15));
  const perStage = Math.min(10, Math.max(2, Number(raw.perStage ?? 4) || 4));
  return { ladder, rounds, perStage };
}

export function drawDesire(pool: DesireQ[], used: string[], seed: string): DesireQ | null {
  return seededShuffle(pool.filter((q) => !used.includes(q.id)), seed)[0] ?? null;
}

/** First ladder stage after `from` that has at least one topic both players chose. */
export function nextStage(agreed: string[] | undefined, from: number): number | null {
  for (const st of LADDER) if (st.n > from && desirePool(agreed, st.cats).length) return st.n;
  return null;
}

function skip(s: SessionApi, step: number) {
  return s.patch((raw) => {
    const now = readState(raw);
    return now.step === step ? { step: step + 1, skipped: [...now.skipped, step] } : null;
  });
}

const advance = (s: SessionApi, step: number) => s.patch((raw) => (readState(raw).step === step ? { step: step + 1 } : null));

/** Is round i finished for both players (answers revealed, or both secret markers present)? */
function roundDone(view: SessionView, q: DesireQ, i: number) {
  if (q.kind === 'secret') {
    const m = entriesFor(view, `pub:xd${i}`);
    return Boolean(m[1] && m[2]);
  }
  const p = entriesFor(view, `seal:x${i}`);
  return Boolean(p[1] && p[2]);
}

export default function DesireGame({ view, s, terms }: ModeProps) {
  const { ladder, rounds, perStage } = readSettings(view);
  const st = readState(view.session.state);
  const agreed = terms.categories as string[] | undefined;
  const stageCats: DesireCat[] = ladder ? (LADDER.find((x) => x.n === st.stage)?.cats ?? []) : ALL_CATS;
  const pool = useMemo(() => desirePool(agreed, stageCats), [agreed?.join(','), stageCats.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const completed = view.session.status === 'completed';
  const current = st.qs[st.step] ? desireById(st.qs[st.step]!) : undefined;
  const done = current ? roundDone(view, current, st.step) : false;
  const outOfBounds = Boolean(current && !done && (!(agreed ?? []).includes(current.cat) || !stageCats.includes(current.cat)));
  const seed = `${view.session.id}:${st.step}`;

  const stageFull = ladder && (st.stage === 0 || st.step - st.stageStart >= perStage);
  const exhausted = !current && !drawDesire(pool, st.qs, seed);
  const atGate = ladder && !current && (stageFull || exhausted);
  const finished = !ladder && (st.step >= rounds || (!current && exhausted));

  useEffect(() => {
    if (completed || current || atGate || finished || exhausted) return;
    void s.patch((raw) => {
      const now = readState(raw);
      if (now.step !== st.step || now.qs[now.step]) return null;
      const q = drawDesire(pool, now.qs, `${view.session.id}:${now.step}`);
      return q ? { qs: [...now.qs.slice(0, now.step), q.id] } : null;
    });
  }, [completed, current, atGate, finished, exhausted, pool, s, st.step, view.session.id]);

  useEffect(() => {
    if (!completed && outOfBounds) void skip(s, st.step);
  }, [completed, outOfBounds, s, st.step]);

  if (completed || finished) return <Results view={view} s={s} terms={terms} />;
  if (atGate) return <StageGate view={view} s={s} agreed={agreed} st={st} />;

  const label = ladder ? `Step ${st.stage} of 5, ${LADDER[st.stage - 1]?.title}` : 'Desire Mode';
  const index = ladder ? st.step - st.stageStart : st.step;
  const total = ladder ? perStage : rounds;

  return (
    <div className="space-y-6">
      {ladder && <LadderBar s={s} st={st} />}
      {current && !outOfBounds ? (
        <Round key={`${st.step}:${current.id}`} view={view} s={s} q={current} i={st.step} index={index} total={total} label={label} />
      ) : (
        <Waiting>Choosing the next question</Waiting>
      )}
    </div>
  );
}

/* ---------------------------------- ladder --------------------------------- */

function LadderBar({ s, st }: { s: SessionApi; st: GameState }) {
  const { busy, run } = useBusy();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-white px-4 py-3 shadow-hairline sm:px-5">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Intensity Ladder</span>
        <div className="flex items-center gap-1" aria-label={`Step ${st.stage} of 5`}>
        {LADDER.map((l) => (
          <span key={l.n} className={`h-1.5 w-5 rounded-[2px] ${l.n <= st.stage ? 'bg-accent' : 'bg-line'}`} />
        ))}
        </div>
      </div>
      {st.stage > 1 && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => run('down', () => s.patch((raw) => (readState(raw).stage === st.stage ? { stage: st.stage - 1, stageStart: readState(raw).step, epoch: st.epoch + 1 } : null)))}
          className="text-sm font-medium text-ink-mute hover:text-accent-deep"
        >
          Go back to step {st.stage - 1}
        </button>
      )}
    </div>
  );
}

function StageGate({ view, s, agreed, st }: { view: SessionView; s: SessionApi; agreed: string[] | undefined; st: GameState }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner = other(me);
  const target = nextStage(agreed, st.stage);
  const key = target ? `pub:st${target}e${st.epoch}` : '';
  const votes = target ? entriesFor(view, key) : {};
  const stage = LADDER.find((l) => l.n === target);

  useEffect(() => {
    if (!target || !votes[1] || !votes[2]) return;
    void s.patch((raw) => {
      const now = readState(raw);
      return now.stage < target && now.epoch === st.epoch ? { stage: target, stageStart: now.step } : null;
    });
  }, [target, votes, s, st.epoch]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-accent">The Intensity Ladder</p>
        <h1 className="mt-1 text-[1.6rem] font-semibold tracking-[-0.02em]">{st.stage === 0 ? 'Ready to begin?' : `Step ${st.stage} complete`}</h1>
        <p className="mt-1.5 text-ink-soft">Each step is more personal, never more pressured. You both opt in before each one, and either of you can stop here.</p>
      </div>

      <ol className="divide-y divide-line rounded-[12px] bg-white shadow-hairline">
        {LADDER.map((l) => {
          const available = desirePool(agreed, l.cats).length > 0;
          const isNext = l.n === target;
          return (
            <li key={l.n} className={`flex items-start gap-4 px-4 py-3.5 sm:px-5 ${isNext ? 'bg-shell' : ''}`}>
              <span className={`tabular grid size-7 shrink-0 place-items-center rounded-[6px] text-sm font-semibold ${l.n <= st.stage ? 'bg-accent text-white' : isNext ? 'bg-white text-accent-deep shadow-[0_0_0_1.5px_var(--color-accent)]' : 'bg-mist text-ink-mute'}`}>
                {l.n <= st.stage ? <Check className="size-3.5" strokeWidth={3} /> : l.n}
              </span>
              <span className="min-w-0">
                <span className={`block font-medium ${available ? '' : 'text-ink-mute'}`}>{l.title}</span>
                <span className="block text-sm text-ink-mute">{available ? l.detail : 'Not in the topics you both chose.'}</span>
                {available && <span className="mt-0.5 block text-xs text-ink-mute">{l.cats.filter((c) => agreed?.includes(c)).map(catTitle).join('  ·  ')}</span>}
              </span>
            </li>
          );
        })}
      </ol>

      {target && stage ? (
        <div className="space-y-3 rounded-[12px] bg-white p-5 shadow-lift">
          <p className="font-medium">
            Next: step {target}, {stage.title}
          </p>
          <p className="text-sm text-ink-soft">
            {votes[me] && !votes[partner] && `You opted in. Waiting for ${names[partner]}, who can say no without giving a reason.`}
            {!votes[me] && votes[partner] && `${names[partner]} has opted in. Only continue if you want to.`}
            {!votes[me] && !votes[partner] && 'You both need to opt in.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {votes[me] ? (
              <Button variant="secondary" loading={busy === 'undo'} onClick={() => run('undo', () => s.remove(key))}>
                Withdraw my opt-in
              </Button>
            ) : (
              <Button loading={busy === 'in'} onClick={() => run('in', () => s.submit(key, {}))}>
                Opt in to step {target}
              </Button>
            )}
            {st.stage > 0 && (
              <Button variant="ghost" loading={busy === 'end'} onClick={() => run('end', () => s.complete())}>
                Finish here and see results
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Note tone="pink">{st.stage === 0 ? 'None of the ladder steps match the topics you both chose. Open Boundaries to include more.' : 'That was the last step your shared topics allow.'}</Note>
          {st.stage > 0 && (
            <Button size="lg" block loading={busy === 'end'} onClick={() => run('end', () => s.complete())}>
              See your results
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- round ---------------------------------- */

function QuestionCard({ q, heading, label, names, answerer, me }: { q: DesireQ; heading: string; label: string; names: Record<PlayerNumber, string>; answerer: PlayerNumber; me: PlayerNumber }) {
  return (
    <article className="animate-flip rounded-[12px] bg-white p-6 shadow-lift sm:p-7">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-medium text-accent">{catTitle(q.cat)}</span>
        <span className="text-ink-mute">Intensity {q.intensity} of 5</span>
        <span className="sr-only">{label}</span>
      </div>
      {q.kind === 'scale' && <p className="mt-3 text-xs font-medium tracking-wide text-ink-mute uppercase">How do you feel about</p>}
      {q.setup && q.kind !== 'scale' && <p className="reading mt-3 border-l-2 border-shell pl-4 text-[1.05rem] leading-relaxed text-ink">{q.setup}</p>}
      {q.kind === 'predict' && (
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
          <Avatar name={names[answerer]} seat={answerer} size="xs" />
          {me === answerer ? (
            <span>
              <span className="font-medium text-ink">Answer for yourself.</span> {names[other(me)]} is predicting.
            </span>
          ) : (
            <span>
              <span className="font-medium text-ink">Predict {names[answerer]}'s answer.</span> The score only counts guesses.
            </span>
          )}
        </p>
      )}
      <h1 className={`mt-2 font-semibold tracking-[-0.015em] text-balance ${q.kind === 'scale' ? 'text-[1.6rem]' : 'text-[1.3rem] leading-snug sm:text-[1.45rem]'}`}>{heading}</h1>
      {q.kind === 'scale' && q.setup && <p className="mt-2 text-[1.02rem] leading-relaxed text-ink-soft">{q.setup}</p>}
      {q.maxPicks === 2 && <p className="mt-3 inline-block rounded-[4px] bg-shell px-2 py-0.5 text-xs font-semibold text-accent-deep">Choose up to 2</p>}
      {q.kind === 'secret' && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-soft">
          <LockKeyhole className="size-3.5 text-accent" aria-hidden="true" /> You choose who can see this answer.
        </p>
      )}
    </article>
  );
}

function Options({ q, value, disabled, onToggle }: { q: DesireQ; value: string[]; disabled: boolean; onToggle: (id: string) => void }) {
  const multi = q.maxPicks > 1;
  const full = multi && value.length >= q.maxPicks;
  return (
    <div role={multi ? 'group' : 'radiogroup'} aria-label="Your answer" className={q.kind === 'scale' ? 'grid gap-2 sm:grid-cols-2' : 'grid gap-2.5'}>
      {q.options.map((o) => {
        const on = value.includes(o.id);
        const blocked = !on && full;
        return (
          <button
            key={o.id}
            type="button"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={on}
            disabled={disabled || blocked}
            onClick={() => onToggle(o.id)}
            className={`flex w-full items-start gap-3.5 rounded-[10px] px-4 py-3.5 text-left transition-[box-shadow,background-color] duration-150 ${
              on ? 'bg-shell shadow-[0_0_0_2px_var(--color-accent)]' : 'bg-white shadow-hairline hover:shadow-lift'
            } disabled:cursor-default ${blocked ? 'opacity-55' : ''} ${q.kind === 'scale' && o.id === 'pass' ? 'sm:col-span-2' : ''}`}
          >
            <span
              className={`mt-0.5 grid size-5 shrink-0 place-items-center text-[0.7rem] font-semibold uppercase ${multi ? 'rounded-[4px]' : 'rounded-full'} ${
                on ? 'bg-accent text-white' : 'text-ink-mute shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]'
              }`}
              aria-hidden="true"
            >
              {on ? <Check className="size-3" strokeWidth={3} /> : q.kind === 'scale' ? '' : o.id}
            </span>
            <span className="text-[1rem] leading-snug text-ink">{o.text}</span>
          </button>
        );
      })}
      {multi && (
        <p className="text-right text-xs text-ink-mute" aria-live="polite">
          {value.length} of up to {q.maxPicks} selected
        </p>
      )}
    </div>
  );
}

function RadioRow<T extends string>({ label, items, value, onChange }: { label: string; items: { id: T; title: string; detail?: string }[]; value: T | null; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={label}>
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            role="radio"
            aria-checked={value === it.id}
            onClick={() => onChange(it.id)}
            className={`rounded-[6px] px-3 py-2.5 text-left ${value === it.id ? 'bg-shell shadow-[0_0_0_1.5px_var(--color-accent)]' : 'bg-white shadow-[0_0_0_1px_var(--color-line-strong)] hover:bg-mist'}`}
          >
            <span className={`block text-sm font-medium ${value === it.id ? 'text-accent-deep' : ''}`}>{it.title}</span>
            {it.detail && <span className="block text-xs text-ink-mute">{it.detail}</span>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Round({ view, s, q, i, index, total, label }: { view: SessionView; s: SessionApi; q: DesireQ; i: number; index: number; total: number; label: string }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner = other(me);
  const answerer = answererFor(i);
  const secretRound = q.kind === 'secret';
  const sealKey = `seal:x${i}`;
  const seal = entriesFor<Answer>(view, sealKey);
  const marker = entriesFor<{ share: Share }>(view, `pub:xd${i}`);
  const mineDone = secretRound ? Boolean(marker[me]) : Boolean(seal[me]);
  const done = roundDone(view, q, i);
  const just = useJustRevealed(`${i}`, done);
  const [holding, setHolding] = useState(false);
  const [picks, setPicks] = useDraft<string[]>(`x${i}`, []);
  const [note, setNote] = useDraft(`x${i}:note`, '');
  const [noteOpen, setNoteOpen] = useState(false);
  const [share, setShare] = useDraft<Share | null>(`x${i}:share`, null);
  const [intent, setIntent] = useDraft<Intent | null>(`x${i}:intent`, null);

  useEffect(() => {
    if (!just) return;
    setHolding(true);
    const t = window.setTimeout(() => setHolding(false), 1100);
    return () => window.clearTimeout(t);
  }, [just]);

  const heading = q.kind === 'predict' && me !== answerer ? (q.them ?? q.text).replaceAll('{name}', names[answerer]) : q.text;
  const ready = validDesire(q, picks) && (!secretRound || (share !== null && intent !== null));
  const partnerAnswered = secretRound ? Boolean(marker[partner]) : partnerHasPending(view, sealKey) || Boolean(seal[partner]);

  async function lock() {
    const payload: Answer = { id: q.id, picks, ...(note.trim() ? { note: note.trim() } : {}), ...(intent ? { intent } : {}) };
    if (!secretRound) return s.submit(sealKey, payload);
    if (share === 'private') await s.submit(`priv:x${i}`, payload);
    else {
      await s.submit(sealKey, payload);
      if (share === 'now') await s.submit(`pub:xs${i}`, payload);
    }
    await s.submit(`pub:xd${i}`, { share });
  }

  return (
    <div className="space-y-6">
      <StepProgress index={index} total={total} label={label} />
      <QuestionCard q={q} heading={heading} label={label} names={names} answerer={answerer} me={me} />

      {holding ? (
        <div className="grid place-items-center rounded-[12px] bg-shell px-6 py-12 text-center" role="status">
          <div className="flex -space-x-2">
            {([1, 2] as PlayerNumber[]).map((seat, k) => (
              <span key={seat} className="animate-pulse-soft" style={{ animationDelay: `${k * 200}ms` }}>
                <Avatar name={names[seat]} seat={seat} className="rounded-full ring-2 ring-shell" />
              </span>
            ))}
          </div>
          <p className="mt-3 font-medium text-accent-deep">Both locked in. Revealing together...</p>
        </div>
      ) : done ? (
        <Reveal view={view} s={s} q={q} i={i} animate={just} last={index + 1 >= total} />
      ) : !mineDone ? (
        <div className="space-y-5">
          <Options q={q} value={picks} disabled={false} onToggle={(id) => setPicks(toggleDesire(q, picks, id))} />
          {secretRound && (
            <>
              <RadioRow label="What would you like to do with this?" items={INTENTS} value={intent} onChange={setIntent} />
              <RadioRow label="Who can see your answer?" items={SHARES} value={share} onChange={setShare} />
            </>
          )}
          {noteOpen ? (
            <TextAnswer label="Your explanation" value={note} onChange={setNote} max={300} rows={2} placeholder="Say more, if you want. Shared with your answer, under the same rule." />
          ) : (
            <button type="button" onClick={() => setNoteOpen(true)} className="text-sm font-medium text-ink-soft hover:text-accent-deep">
              + Add an explanation (optional)
            </button>
          )}
          <Button size="lg" block disabled={!ready} loading={busy === 'lock'} onClick={() => run('lock', lock)}>
            {q.kind === 'predict' && me !== answerer ? 'Lock in my prediction' : 'Lock in my answer'}
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-ink-mute">{partnerAnswered ? `${names[partner]} has answered.` : `${names[partner]} can't see your answer until the reveal.`}</span>
            <button type="button" disabled={busy !== null} onClick={() => run('skip', () => skip(s, i))} className="inline-flex items-center gap-1 font-medium text-ink-mute hover:text-ink">
              <SkipForward className="size-3.5" aria-hidden="true" /> Skip this question
            </button>
          </div>
          {secretRound && marker[partner]?.payload.share === 'now' && <PartnerOpenAnswer view={view} q={q} i={i} />}
        </div>
      ) : (
        <div className="space-y-3">
          <Waiting>Locked in. Waiting for {names[partner]}.</Waiting>
          <p className="text-center text-sm text-ink-mute">
            Rather not wait?{' '}
            <button type="button" disabled={busy !== null} onClick={() => run('skip', () => skip(s, i))} className="font-medium text-ink-soft underline-offset-2 hover:underline">
              Skip it for both of you
            </button>
            . Nothing is revealed.
          </p>
        </div>
      )}
    </div>
  );
}

/** A partner shared a secret answer immediately; let the other answer first if they prefer. */
function PartnerOpenAnswer({ view, q, i }: { view: SessionView; q: DesireQ; i: number }) {
  const [open, setOpen] = useState(false);
  const names = seatNames(view);
  const partner = other(view.me.player_number);
  const a = entriesFor<Answer>(view, `pub:xs${i}`)[partner];
  if (!a) return null;
  return (
    <div className="rounded-[10px] bg-shell px-4 py-3 text-sm">
      {open ? (
        <AnswerLine q={q} seat={partner} name={names[partner]} a={a.payload} />
      ) : (
        <p>
          {names[partner]} chose to share their answer openly.{' '}
          <button type="button" onClick={() => setOpen(true)} className="font-medium text-accent-deep underline-offset-2 hover:underline">
            View it now
          </button>{' '}
          or answer yours first.
        </p>
      )}
    </div>
  );
}

const optText = (q: DesireQ, ids: string[]) => ids.map((id) => q.options.find((o) => o.id === id)?.text ?? id).join(' + ');
const intentText = (x?: Intent) => INTENTS.find((t) => t.id === x)?.title;

function AnswerLine({ q, seat, name, a, you }: { q: DesireQ; seat: PlayerNumber; name: string; a: Answer; you?: boolean }) {
  return (
    <div>
      <p>
        <span className={`font-medium ${seatTone[seat].text}`}>{you ? 'You' : name}: </span>
        {optText(q, a.picks)}
      </p>
      {a.intent && <p className="mt-0.5 text-xs text-ink-mute">{intentText(a.intent)}</p>}
      {a.note && <p className="mt-1 text-[0.95rem] text-ink-soft">"{a.note}"</p>}
    </div>
  );
}

/* ---------------------------------- reveal --------------------------------- */

/** What a seat's answer looks like to me, honouring every disclosure choice. */
function visibleAnswer(view: SessionView, i: number, seat: PlayerNumber): { a?: Answer; share?: Share } {
  const me = view.me.player_number;
  const share = entriesFor<{ share: Share }>(view, `pub:xd${i}`)[seat]?.payload.share;
  if (seat === me) {
    const a = entriesFor<Answer>(view, `priv:x${i}`)[me] ?? entriesFor<Answer>(view, `seal:x${i}`)[me];
    return { a: a?.payload, share };
  }
  const open = entriesFor<Answer>(view, `pub:xs${i}`)[seat];
  const sealed = entriesFor<Answer>(view, `seal:x${i}`)[seat];
  return { a: (open ?? sealed)?.payload, share };
}

function Reveal({ view, s, q, i, animate, last }: { view: SessionView; s: SessionApi; q: DesireQ; i: number; animate: boolean; last: boolean }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner = other(me);
  const later = entriesFor(view, `pub:later${i}`);
  const follow = entriesFor<FollowUp>(view, `pub:f${i}`);
  const [more, setMore] = useState(Boolean(follow[1] || follow[2]));
  const [draft, setDraft] = useDraft(`f${i}`, '');

  const mine = visibleAnswer(view, i, me);
  const theirs = visibleAnswer(view, i, partner);
  const bothVisible = Boolean(mine.a && theirs.a) && !(q.kind === 'secret' && mine.share === 'private');
  const verdict = bothVisible ? pairVerdict(q, me === 1 ? mine.a!.picks : theirs.a!.picks, me === 1 ? theirs.a!.picks : mine.a!.picks) : null;

  return (
    <div className="space-y-5">
      {q.kind === 'scale' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {([me, partner] as PlayerNumber[]).map((seat, k) => {
            const a = seat === me ? mine.a : theirs.a;
            const open = a && OPEN.includes(a.picks[0] ?? '');
            return (
              <div key={seat} className={`rounded-[10px] p-4 ${open ? 'bg-shell' : 'bg-white shadow-hairline'} ${animate ? 'animate-flip' : ''}`} style={animate ? { animationDelay: `${k * 140}ms` } : undefined}>
                <div className="flex items-center gap-2">
                  <Avatar name={names[seat]} seat={seat} size="xs" />
                  <span className={`text-sm font-medium ${seatTone[seat].text}`}>{seat === me ? 'You' : names[seat]}</span>
                </div>
                <p className="mt-2 text-[1.15rem] font-semibold">{a ? optText(q, a.picks) : '-'}</p>
                {a?.note && <p className="mt-1 text-sm text-ink-soft">"{a.note}"</p>}
              </div>
            );
          })}
        </div>
      ) : q.kind === 'secret' ? (
        <SecretReveal view={view} s={s} q={q} i={i} mine={mine} theirs={theirs} />
      ) : (
        <ul className="grid gap-2.5" aria-label="Revealed answers">
          {q.options.map((o) => {
            const who = ([me, partner] as PlayerNumber[]).filter((seat) => (seat === me ? mine.a : theirs.a)?.picks.includes(o.id));
            const both = who.length === 2;
            return (
              <li
                key={o.id}
                className={`flex items-start gap-3.5 rounded-[10px] px-4 py-3.5 ${both ? 'bg-shell shadow-[0_0_0_2px_var(--color-accent)]' : who.length ? 'bg-white shadow-lift' : 'bg-white/60 opacity-60 shadow-hairline'} ${both && animate ? 'animate-land' : ''}`}
              >
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center text-[0.7rem] font-semibold text-ink-mute uppercase" aria-hidden="true">
                  {o.id}
                </span>
                <span className="flex-1 leading-snug text-ink">{o.text}</span>
                <span className="flex shrink-0 -space-x-1.5">
                  {who.map((seat, k) => (
                    <span key={seat} className={animate ? 'animate-land' : ''} style={animate ? { animationDelay: `${150 + k * 160}ms` } : undefined}>
                      <Avatar name={names[seat]} seat={seat} size="sm" className="rounded-full ring-2 ring-white" />
                    </span>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {verdict && <p className={`text-[1.05rem] font-medium ${verdict === 'same' || verdict === 'both-open' ? 'text-accent-deep' : 'text-ink'}`}>{verdictText(verdict, q.kind === 'predict')}</p>}
      {q.kind === 'predict' && <PredictionScore view={view} />}
      {q.kind !== 'scale' && q.kind !== 'secret' && (
        <div className="space-y-1.5 text-[0.95rem]">
          {([me, partner] as PlayerNumber[])
            .map((seat) => ({ seat, a: seat === me ? mine.a : theirs.a }))
            .filter((x) => x.a?.note)
            .map(({ seat, a }) => (
              <p key={seat}>
                <span className={`font-medium ${seatTone[seat].text}`}>{seat === me ? 'You' : names[seat]}: </span>
                {a!.note}
              </p>
            ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon={<MessageCircleMore className="size-4" />} onClick={() => setMore((x) => !x)} aria-expanded={more}>
          <span className="inline-flex items-center gap-1 whitespace-nowrap">Follow-up <ChevronDown className={`size-3.5 transition-transform ${more ? 'rotate-180' : ''}`} aria-hidden="true" /></span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={<Bookmark className={`size-4 ${later[me] ? 'fill-accent text-accent' : ''}`} />}
          aria-pressed={Boolean(later[me])}
          loading={busy === 'later'}
          onClick={() => run('later', () => (later[me] ? s.remove(`pub:later${i}`) : s.submit(`pub:later${i}`, { id: q.id })))}
        >
          {later[me] ? 'Saved to discuss later' : 'Discuss later'}
        </Button>
      </div>

      {more && (
        <div className="animate-rise space-y-3 rounded-[12px] bg-shell p-5">
          <p className="font-medium text-ink">{q.followUp}</p>
          {([me, partner] as PlayerNumber[])
            .filter((seat) => follow[seat])
            .map((seat) => (
              <p key={seat} className="rounded-[8px] bg-white p-3.5 text-[0.95rem] shadow-hairline">
                <span className={`font-medium ${seatTone[seat].text}`}>{seat === me ? 'You' : names[seat]}: </span>
                {follow[seat]!.payload.text}
              </p>
            ))}
          {!follow[me] && (
            <div className="space-y-2">
              <TextAnswer label="Your follow-up" value={draft} onChange={setDraft} max={400} rows={3} placeholder="Optional. Shared with your partner only when you press Share." />
              {draft.trim() && (
                <Button size="sm" loading={busy === 'f'} onClick={() => run('f', () => s.submit(`pub:f${i}`, { prompt: q.followUp, text: draft.trim() }))}>
                  Share
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <Button
        size="lg"
        block
        loading={busy === 'next'}
        onClick={() =>
          run('next', async () => {
            await advance(s, i);
            if (last && !readSettings(view).ladder) await s.complete();
          })
        }
      >
        {last ? (readSettings(view).ladder ? 'Finish this step' : 'See your results') : 'Next question'}
      </Button>
    </div>
  );
}

function SecretReveal({ view, s, q, i, mine, theirs }: { view: SessionView; s: SessionApi; q: DesireQ; i: number; mine: { a?: Answer; share?: Share }; theirs: { a?: Answer; share?: Share } }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner = other(me);
  const sharedMine = Boolean(entriesFor(view, `pub:xs${i}`)[me]);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-[10px] bg-white p-4 shadow-hairline">
        {mine.a && <AnswerLine q={q} seat={me} name={names[me]} a={mine.a} you />}
        {mine.share === 'private' && !sharedMine ? (
          <div className="mt-3 border-t border-line pt-3 text-sm text-ink-soft">
            <p className="flex items-start gap-1.5">
              <EyeOff className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> <span>Only you can see this.</span>
            </p>
            {mine.a && (
              <button type="button" disabled={busy !== null} className="mt-2 text-sm font-semibold text-accent hover:text-accent-deep disabled:opacity-50" onClick={() => run('share', () => s.submit(`pub:xs${i}`, mine.a!))}>
                {busy === 'share' ? 'Sharing...' : `Share it with ${names[partner]}`}
              </button>
            )}
          </div>
        ) : (
          <p className="mt-3 border-t border-line pt-3 text-xs text-ink-mute">
            {sharedMine ? `Shared with ${names[partner]}.` : theirs.share === 'private' ? `Still hidden from ${names[partner]}, because they kept theirs private.` : 'Revealed because you both shared.'}
          </p>
        )}
      </div>
      <div className="rounded-[10px] bg-white p-4 shadow-hairline">
        {theirs.a ? (
          <AnswerLine q={q} seat={partner} name={names[partner]} a={theirs.a} />
        ) : theirs.share === 'private' ? (
          <p className="flex items-start gap-2 text-ink-soft">
            <EyeOff className="mt-1 size-4 shrink-0" aria-hidden="true" /> <span>Your partner marked this as private.</span>
          </p>
        ) : (
          <p className="text-sm text-ink-soft">{names[partner]} chose to reveal only if you both shared. Because yours is private, theirs stays hidden too.</p>
        )}
      </div>
    </div>
  );
}

function predictionRows(view: SessionView) {
  const st = readState(view.session.state);
  const out: { i: number; q: DesireQ; a: string[]; b: string[] }[] = [];
  st.qs.forEach((id, i) => {
    const q = desireById(id);
    const p = entriesFor<Answer>(view, `seal:x${i}`);
    if (q && q.kind !== 'secret' && p[1] && p[2]) out.push({ i, q, a: p[1].payload.picks, b: p[2].payload.picks });
  });
  return out;
}

function predictionScore(view: SessionView) {
  const score: Record<PlayerNumber, { right: number; tries: number }> = { 1: { right: 0, tries: 0 }, 2: { right: 0, tries: 0 } };
  for (const r of predictionRows(view)) {
    if (r.q.kind !== 'predict') continue;
    const predictor = other(answererFor(r.i));
    score[predictor].tries++;
    if (pairVerdict(r.q, r.a, r.b) === 'same') score[predictor].right++;
  }
  return score;
}

function PredictionScore({ view }: { view: SessionView }) {
  const names = seatNames(view);
  const me = view.me.player_number;
  const sc = predictionScore(view);
  return (
    <p className="text-sm text-ink-mute">
      Prediction accuracy: {([me, other(me)] as PlayerNumber[]).map((seat) => `${seat === me ? 'You' : names[seat]} ${sc[seat].right}/${sc[seat].tries}`).join(', ')}. It only measures guesses, nothing else.
    </p>
  );
}

/* --------------------------------- results --------------------------------- */

function Results({ view, s }: ModeProps) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner = other(me);
  if (view.session.status !== 'completed') {
    return (
      <Button size="lg" block loading={busy === 'c'} onClick={() => run('c', () => s.complete())}>
        See your results
      </Button>
    );
  }
  const st = readState(view.session.state);
  const rows = predictionRows(view).map((r) => ({ ...r, v: pairVerdict(r.q, r.a, r.b) }));
  const choices = rows.filter((r) => r.q.kind === 'choice');
  const shared = choices.filter((r) => r.v === 'same' || r.v === 'overlap');
  const different = choices.filter((r) => r.v === 'different' || r.v === 'overlap');
  const scales = rows.filter((r) => r.q.kind === 'scale');
  const explore = scales.filter((r) => r.v === 'both-open');

  const secrets = st.qs.map((id, i) => ({ i, q: desireById(id) })).filter((x): x is { i: number; q: DesireQ } => Boolean(x.q && x.q.kind === 'secret' && roundDone(view, x.q, x.i)));
  const secretVis = secrets.map((x) => ({ ...x, mine: visibleAnswer(view, x.i, me), theirs: visibleAnswer(view, x.i, partner) }));
  const secretExplore = secretVis.filter((x) => x.mine.a && x.theirs.a && x.mine.share !== 'private' && ['discuss', 'someday'].includes(x.mine.a.intent ?? '') && ['discuss', 'someday'].includes(x.theirs.a.intent ?? ''));
  const privateTopics = [
    ...secretVis.filter((x) => x.mine.share === 'private' || x.theirs.share === 'private').map((x) => ({
      q: x.q,
      who: x.mine.share === 'private' && x.theirs.share === 'private' ? 'You both kept this private.' : x.mine.share === 'private' ? 'You kept this private.' : 'Your partner marked this as private.',
    })),
    ...scales
      .filter((r) => r.v === 'pass')
      .map((r) => {
        const mineP = (me === 1 ? r.a : r.b).includes('pass');
        const theirP = (me === 1 ? r.b : r.a).includes('pass');
        return { q: r.q, who: mineP && theirP ? 'You both preferred not to answer.' : mineP ? 'You preferred not to answer.' : 'Your partner preferred not to answer.' };
      }),
  ];
  const laterIdx = new Set(entriesWithPrefix(view, 'pub:later').filter((e) => /^pub:later\d+$/.test(e.key)).map((e) => Number(e.key.slice(9))));
  const later = st.qs.map((id, i) => ({ i, q: desireById(id) })).filter((x) => x.q && laterIdx.has(x.i));
  const reflections = entriesWithPrefix<FollowUp>(view, 'pub:f').filter((e) => /^pub:f\d+$/.test(e.key));
  const score = predictionScore(view);
  const answered = rows.length + secrets.length;
  const mineOf = (r: { a: string[]; b: string[] }) => (me === 1 ? r.a : r.b);
  const theirsOf = (r: { a: string[]; b: string[] }) => (me === 1 ? r.b : r.a);

  return (
    <Recap
      view={view}
      mode="desire"
      title="Desire Mode"
      stats={[
        ['Answered', answered],
        ['Shared', shared.length],
        ['To explore', explore.length + secretExplore.length],
        ['Skipped', st.skipped.length],
      ]}
      momentTitle="Topics we both want to explore"
      momentBody={[...explore.map((r) => r.q.text), ...secretExplore.map((x) => x.q.text)].join('\n')}
    >
      <section className="rounded-[12px] bg-white p-5 shadow-hairline">
        <h2 className="font-semibold">Summary</h2>
        <p className="mt-1.5 leading-relaxed text-ink-soft">
          You answered {answered} {answered === 1 ? 'question' : 'questions'} together.
          {shared.length > 0 && ` You shared a preference on ${shared.length}.`}
          {different.length > 0 && ` You approached ${different.length} differently, which is where the best conversations start.`}
          {explore.length + secretExplore.length > 0 && ` There ${explore.length + secretExplore.length === 1 ? 'is 1 topic' : `are ${explore.length + secretExplore.length} topics`} you are both open to talking about.`}
          {score[1].tries + score[2].tries > 0 && ` Prediction accuracy: you ${score[me].right}/${score[me].tries}, ${names[partner]} ${score[partner].right}/${score[partner].tries}.`}
        </p>
        <p className="mt-3 text-sm text-ink-mute">Interest is not agreement. Anything you might try is decided together, later, and either of you can change your mind.</p>
      </section>
      <RecapList
        title="Shared interests"
        items={shared.map((r) => (
          <>
            <p className="text-sm text-ink-mute">{r.q.text}</p>
            <p className="mt-1 font-medium">{optText(r.q, mineOf(r).filter((x) => theirsOf(r).includes(x)))}</p>
          </>
        ))}
      />
      <RecapList
        title="Topics you both want to explore"
        items={[
          ...explore.map((r) => (
            <>
              <p className="font-medium">{r.q.text}</p>
              <p className="mt-0.5 text-sm text-ink-soft">
                You: {optText(r.q, mineOf(r))}. {names[partner]}: {optText(r.q, theirsOf(r))}.
              </p>
            </>
          )),
          ...secretExplore.map((x) => (
            <>
              <p className="text-sm text-ink-mute">{x.q.text}</p>
              <p className="mt-1 text-sm">
                You: {optText(x.q, x.mine.a!.picks)} ({intentText(x.mine.a!.intent)?.toLowerCase()}). {names[partner]}: {optText(x.q, x.theirs.a!.picks)} ({intentText(x.theirs.a!.intent)?.toLowerCase()}).
              </p>
            </>
          )),
        ]}
      />
      <RecapList
        title="Different preferences"
        items={different.map((r) => (
          <>
            <p className="text-sm text-ink-mute">{r.q.text}</p>
            <p className="mt-1 text-sm">
              <span className={`font-medium ${seatTone[me].text}`}>You: </span>
              {optText(r.q, mineOf(r))}
            </p>
            <p className="mt-0.5 text-sm">
              <span className={`font-medium ${seatTone[partner].text}`}>{names[partner]}: </span>
              {optText(r.q, theirsOf(r))}
            </p>
          </>
        ))}
      />
      <RecapList
        title="Kept private"
        items={privateTopics.map((x) => (
          <>
            <p className="text-sm">{x.q.text}</p>
            <p className="mt-0.5 text-sm text-ink-mute">{x.who}</p>
          </>
        ))}
      />
      <RecapList title="Worth discussing later" items={later.map((x) => <span className="font-medium">{x.q!.text}</span>)} />
      <RecapList
        title="Reflections"
        items={reflections.map((e) => (
          <>
            <p className="text-sm text-ink-mute">{e.payload.prompt}</p>
            <p className="mt-1 text-sm">
              <span className={`font-medium ${seatTone[e.player_number].text}`}>{e.player_number === me ? 'You' : names[e.player_number]}: </span>
              {e.payload.text}
            </p>
          </>
        ))}
      />
      <p className="text-sm text-ink-mute">No compatibility scores and no rankings. Skipped questions say nothing about either of you.</p>
    </Recap>
  );
}
