import { useEffect, useMemo, useState } from 'react';
import { ArrowUp, Bookmark, Check, ChevronDown, MessageCircleMore, SkipForward } from 'lucide-react';
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
  DECKS,
  MCQ_LEVELS,
  compare,
  followUpFor,
  mcqById,
  mcqPool,
  pickLabel,
  togglePick,
  validPicks,
  type Deck,
  type Mcq,
  type McqLevel,
} from '../content/mcq';
import { Recap, RecapList } from '../Recap';
import { FavouriteButton } from '../shared';

/**
 * The Question Game: scenario MCQs answered in private, locked, and revealed
 * together. The server keeps each `seal:` answer hidden until both exist.
 *
 * Shared state:
 *   qs[i]    question id drawn for step i (drawn once, so both devices agree)
 *   step     current index
 *   level    agreed level; only rises when both have a `pub:up` entry
 *   epoch    bumps when stepping down, so earlier "go higher" taps are forgotten
 *   skipped  steps either player skipped (no answers are revealed for these)
 */
type Answer = { id: string; picks: string[]; note?: string };
type FollowUp = { prompt: string; text: string };

const DEFAULT_ROUNDS = 12;
const ALL_DECKS = DECKS.map((d) => d.id);
const other = (p: PlayerNumber): PlayerNumber => (p === 1 ? 2 : 1);
const answererFor = (i: number): PlayerNumber => (i % 2 === 0 ? 1 : 2);
const levelInfo = (n: number) => MCQ_LEVELS.find((l) => l.n === n) ?? MCQ_LEVELS[0]!;

interface GameState {
  step: number;
  qs: string[];
  level: McqLevel;
  epoch: number;
  skipped: number[];
}

function readState(view: SessionView): GameState {
  const st = view.session.state;
  return {
    step: Number(st.step ?? 0),
    qs: Array.isArray(st.qs) ? (st.qs as string[]) : [],
    level: Math.min(5, Math.max(1, Number(st.level ?? 1))) as McqLevel,
    epoch: Number(st.epoch ?? 0),
    skipped: Array.isArray(st.skipped) ? (st.skipped as number[]) : [],
  };
}

function readSettings(view: SessionView) {
  const raw = view.session.settings;
  const decks = Array.isArray(raw.decks) ? (raw.decks as string[]).filter((d): d is Deck => ALL_DECKS.includes(d as Deck)) : [];
  const rounds = Math.min(40, Math.max(4, Number(raw.rounds ?? DEFAULT_ROUNDS) || DEFAULT_ROUNDS));
  return { decks: decks.length ? decks : ALL_DECKS, rounds };
}

/** Next question: current level first, then gentler ones, never one already used. */
export function drawNext(pool: Mcq[], used: string[], level: number, seed: string): Mcq | null {
  const fresh = seededShuffle(
    pool.filter((q) => !used.includes(q.id)),
    seed,
  );
  return fresh.find((q) => q.level === level) ?? fresh[0] ?? null;
}

export default function QuestionGame({ view, s, terms }: ModeProps) {
  const { decks, rounds } = readSettings(view);
  const st = readState(view);
  const level = Math.min(st.level, terms.level ?? 1) as McqLevel;
  const pool = useMemo(() => mcqPool(terms, decks, level), [terms, decks.join(','), level]); // eslint-disable-line react-hooks/exhaustive-deps
  const completed = view.session.status === 'completed';
  const current = st.qs[st.step] ? mcqById(st.qs[st.step]!) : undefined;
  const pair = entriesFor<Answer>(view, `seal:q${st.step}`);
  const revealed = Boolean(pair[1] && pair[2]);
  const outOfBounds = Boolean(current && !revealed && !pool.some((q) => q.id === current.id));
  const finished = st.step >= rounds;
  const exhausted = !finished && !current && !drawNext(pool, st.qs, level, `${view.session.id}:${st.step}`);

  // Draw the question for this step once; compare-and-set keeps both devices in agreement.
  useEffect(() => {
    if (completed || finished || current || exhausted) return;
    void s.patch((raw) => {
      const now = readStateFrom(raw);
      if (now.step !== st.step || now.qs[now.step]) return null;
      const q = drawNext(pool, now.qs, level, `${view.session.id}:${now.step}`);
      if (!q) return null;
      return { qs: [...now.qs.slice(0, now.step), q.id] };
    });
  }, [completed, finished, current, exhausted, st.step, pool, level, s, view.session.id]);

  // Boundaries narrowed mid-question: move on quietly, revealing nothing.
  useEffect(() => {
    if (!completed && outOfBounds) void skip(s, st.step);
  }, [completed, outOfBounds, s, st.step]);

  if (completed || finished || exhausted) return <Results view={view} s={s} terms={terms} rounds={rounds} exhausted={exhausted} />;

  return (
    <div className="space-y-6">
      <LevelBar view={view} s={s} level={level} ceiling={(terms.level ?? 1) as McqLevel} epoch={st.epoch} stateLevel={st.level} />
      {current && !outOfBounds ? (
        <Round key={`${st.step}:${current.id}`} view={view} s={s} q={current} i={st.step} total={rounds} />
      ) : (
        <Waiting>Choosing the next question</Waiting>
      )}
    </div>
  );
}

function readStateFrom(raw: Record<string, unknown>): GameState {
  return readState({ session: { state: raw } } as unknown as SessionView);
}

function skip(s: SessionApi, step: number) {
  return s.patch((raw) => {
    const now = readStateFrom(raw);
    if (now.step !== step) return null;
    return { step: step + 1, skipped: [...now.skipped, step] };
  });
}

function advance(s: SessionApi, step: number) {
  return s.patch((raw) => (readStateFrom(raw).step === step ? { step: step + 1 } : null));
}

/* ------------------------------------------------------------------------- */

function LevelBar({ view, s, level, ceiling, epoch, stateLevel }: { view: SessionView; s: SessionApi; level: McqLevel; ceiling: McqLevel; epoch: number; stateLevel: McqLevel }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner = other(me);
  const target = (level + 1) as McqLevel;
  const key = `pub:up${target}e${epoch}`;
  const votes = entriesFor(view, key);
  const canRise = level < ceiling;
  const info = levelInfo(level);

  // Both said yes: raise the level. Either device may apply it; the patch is idempotent.
  useEffect(() => {
    if (canRise && votes[1] && votes[2] && stateLevel < target) {
      void s.patch((raw) => (Number(raw.level ?? 1) < target && Number(raw.epoch ?? 0) === epoch ? { level: target } : null));
    }
  }, [canRise, votes, stateLevel, target, epoch, s]);

  return (
    <div className="rounded-[10px] bg-white p-4 shadow-hairline sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-ink-mute uppercase">Level {level} of 5</p>
          <p className="font-semibold">{info.title}</p>
        </div>
        <div className="flex items-center gap-1" aria-hidden="true">
          {MCQ_LEVELS.map((l) => (
            <span key={l.n} className={`h-1.5 w-6 rounded-[2px] ${l.n <= level ? 'bg-accent' : l.n <= ceiling ? 'bg-line-strong' : 'bg-line'}`} />
          ))}
        </div>
      </div>

      {canRise ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
          {votes[me] && !votes[partner] && <span className="text-ink-soft">You suggested Level {target}. {names[partner]} can join you, or not. Either is fine.</span>}
          {!votes[me] && votes[partner] && (
            <span className="text-ink">
              <span className="font-medium">{names[partner]}</span> would like to try Level {target}, {levelInfo(target).title}. Only if you want to.
            </span>
          )}
          {!votes[me] && !votes[partner] && <span className="text-ink-soft">Next: Level {target}, {levelInfo(target).title}. You both need to agree.</span>}
          <div className="flex gap-1">
            {votes[me] ? (
              <Button size="sm" variant="ghost" loading={busy === 'undo'} onClick={() => run('undo', () => s.remove(key))}>
                Withdraw
              </Button>
            ) : (
              <Button size="sm" variant="secondary" icon={<ArrowUp className="size-4" />} loading={busy === 'up'} onClick={() => run('up', () => s.submit(key, {}))}>
                {votes[partner] ? `Yes, Level ${target}` : `Suggest Level ${target}`}
              </Button>
            )}
          </div>
        </div>
      ) : (
        level < 5 && <p className="mt-3 border-t border-line pt-3 text-sm text-ink-mute">Your shared boundaries stop here. Either of you can change that in Boundaries.</p>
      )}
      {level > 1 && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => run('down', () => s.patch((raw) => (Number(raw.level ?? 1) === stateLevel ? { level: Math.max(1, level - 1), epoch: epoch + 1 } : null)))}
          className="mt-2 text-sm font-medium text-ink-mute hover:text-accent-deep"
        >
          Take it back to Level {level - 1}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function Round({ view, s, q, i, total }: { view: SessionView; s: SessionApi; q: Mcq; i: number; total: number }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner = other(me);
  const key = `seal:q${i}`;
  const pair = entriesFor<Answer>(view, key);
  const mine = pair[me];
  const revealed = Boolean(pair[1] && pair[2]);
  const just = useJustRevealed(key, revealed);
  const [holding, setHolding] = useState(false);
  const [picks, setPicks] = useDraft<string[]>(key, []);
  const [note, setNote] = useDraft(`${key}:note`, '');
  const [noteOpen, setNoteOpen] = useState(false);
  const predictive = q.kind === 'predictive';
  const answerer = answererFor(i);
  const label = pickLabel(q);
  const deck = DECKS.find((d) => d.id === q.deck)!;

  // A short beat of anticipation before the reveal.
  useEffect(() => {
    if (!just) return;
    setHolding(true);
    const t = window.setTimeout(() => setHolding(false), 1100);
    return () => window.clearTimeout(t);
  }, [just]);

  const heading = predictive && me !== answerer ? (q.them ?? q.text).replaceAll('{name}', names[answerer]) : q.text;
  const showReveal = revealed && !holding;

  return (
    <div className="space-y-6">
      <StepProgress index={i} total={total} label={deck.title} />

      <article key={q.id} className="animate-flip rounded-[12px] bg-white p-6 shadow-lift sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-accent">
            Level {q.level}, {levelInfo(q.level).title}
          </p>
          <FavouriteButton view={view} s={s} id={q.id} text={q.text} />
        </div>
        {q.scene && (
          <dl className="mt-3 space-y-2.5 border-l-2 border-shell pl-4">
            {(
              [
                ['Setting', q.scene.setting],
                ['Atmosphere', q.scene.atmosphere],
                ['Situation', q.scene.situation],
              ] as const
            ).map(([t, v]) => (
              <div key={t}>
                <dt className="text-xs font-medium tracking-wide text-ink-mute uppercase">{t}</dt>
                <dd className="reading text-[1.05rem] leading-relaxed text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {predictive && (
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
            <Avatar name={names[answerer]} seat={answerer} size="xs" />
            {me === answerer ? (
              <span>
                <span className="font-medium text-ink">Answer for yourself.</span> {names[partner]} is predicting your answer.
              </span>
            ) : (
              <span>
                <span className="font-medium text-ink">Predict {names[answerer]}'s answer.</span> Just for fun.
              </span>
            )}
          </p>
        )}
        <h1 className="mt-3 text-[1.3rem] leading-snug font-semibold tracking-[-0.015em] text-balance sm:text-[1.45rem]">{heading}</h1>
        {label && <p className="mt-2 inline-block rounded-[4px] bg-shell px-2 py-0.5 text-xs font-semibold text-accent-deep">{label}</p>}
      </article>

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
      ) : showReveal ? (
        <Reveal view={view} s={s} q={q} i={i} total={total} pair={pair as Record<PlayerNumber, { payload: Answer }>} animate={just} />
      ) : (
        <>
          <Options
            q={q}
            value={mine ? mine.payload.picks : picks}
            disabled={Boolean(mine)}
            onToggle={(id) => setPicks(togglePick(q, picks, id))}
          />

          {!mine ? (
            <div className="space-y-3">
              {noteOpen ? (
                <TextAnswer label="Your note" value={note} onChange={setNote} max={280} rows={2} placeholder="Why this one? Only revealed when you both lock in. (optional)" />
              ) : (
                <button type="button" onClick={() => setNoteOpen(true)} className="text-sm font-medium text-ink-soft hover:text-accent-deep">
                  + Add a short explanation (optional)
                </button>
              )}
              <Button
                size="lg"
                block
                disabled={!validPicks(q, picks)}
                loading={busy === 'lock'}
                onClick={() => run('lock', () => s.submit(key, { id: q.id, picks, ...(note.trim() ? { note: note.trim() } : {}) }))}
              >
                {predictive && me !== answerer ? 'Lock in my prediction' : 'Lock in my answer'}
              </Button>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-ink-mute">
                  {partnerHasPending(view, key) ? `${names[partner]} has locked in.` : `${names[partner]} can't see your answer until you both lock in.`}
                </span>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => run('skip', () => skip(s, i))}
                  className="inline-flex items-center gap-1 font-medium text-ink-mute hover:text-ink"
                >
                  <SkipForward className="size-3.5" aria-hidden="true" /> Skip this question
                </button>
              </div>
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
        </>
      )}
    </div>
  );
}

function Options({ q, value, disabled, onToggle }: { q: Mcq; value: string[]; disabled: boolean; onToggle: (id: string) => void }) {
  const multi = q.maxPicks > 1;
  const full = multi && value.length >= q.maxPicks;
  return (
    <div role={multi ? 'group' : 'radiogroup'} aria-label="Your answer" className="grid gap-2.5">
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
            } disabled:cursor-default ${blocked ? 'opacity-55' : ''}`}
          >
            <span
              className={`mt-0.5 grid size-5 shrink-0 place-items-center text-[0.7rem] font-semibold uppercase ${multi ? 'rounded-[4px]' : 'rounded-full'} ${
                on ? 'bg-accent text-white' : 'text-ink-mute shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]'
              }`}
              aria-hidden="true"
            >
              {on ? <Check className="size-3" strokeWidth={3} /> : o.id}
            </span>
            <span className="text-[1rem] leading-snug text-ink">{o.text}</span>
          </button>
        );
      })}
      {multi && (
        <p className="text-right text-xs text-ink-mute" aria-live="polite">
          {value.length} of {q.maxPicks === 4 ? 'up to 4' : `up to ${q.maxPicks}`} selected
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function verdict(q: Mcq, a: string[], b: string[]): { text: string; same: boolean } {
  const c = compare(a, b);
  if (q.kind === 'predictive') return c.same ? { text: 'Spot on. The prediction matched.', same: true } : { text: 'Not this time. Now you know something new.', same: false };
  if (c.same) return { text: 'You chose the same answer.', same: true };
  if (c.shared.length) return { text: 'Some overlap, and some differences. There may be more to discover here.', same: false };
  return { text: 'You approached this differently. Ask your partner what made their option appealing.', same: false };
}

function Reveal({ view, s, q, i, total, pair, animate }: { view: SessionView; s: SessionApi; q: Mcq; i: number; total: number; pair: Record<PlayerNumber, { payload: Answer }>; animate: boolean }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner = other(me);
  const answerer = answererFor(i);
  const predictive = q.kind === 'predictive';
  const a = pair[1].payload.picks;
  const b = pair[2].payload.picks;
  const v = verdict(q, a, b);
  const later = entriesFor(view, `pub:later${i}`);
  const follow = entriesFor<FollowUp>(view, `pub:f${i}`);
  const [more, setMore] = useState(Boolean(follow[1] || follow[2]));
  const [draft, setDraft] = useDraft(`f${i}`, '');
  const myPrompt = followUpFor(q, pair[me].payload.picks);
  const score = predictionScore(view);

  return (
    <div className="space-y-5">
      <ul className="grid gap-2.5" aria-label="Revealed answers">
        {q.options.map((o) => {
          const who = ([me, partner] as PlayerNumber[]).filter((seat) => pair[seat].payload.picks.includes(o.id));
          const both = who.length === 2;
          return (
            <li
              key={o.id}
              className={`flex items-start gap-3.5 rounded-[10px] px-4 py-3.5 transition-opacity ${
                both ? 'bg-shell shadow-[0_0_0_2px_var(--color-accent)]' : who.length ? 'bg-white shadow-lift' : 'bg-white/60 opacity-60 shadow-hairline'
              } ${both && animate ? 'animate-land' : ''}`}
            >
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center text-[0.7rem] font-semibold text-ink-mute uppercase" aria-hidden="true">
                {o.id}
              </span>
              <span className="flex-1 leading-snug text-ink">{o.text}</span>
              <span className="flex shrink-0 -space-x-1.5">
                {who.map((seat, k) => (
                  <span key={seat} className={animate ? 'animate-land' : ''} style={animate ? { animationDelay: `${150 + k * 160}ms` } : undefined} title={predictive ? (seat === answerer ? 'Answer' : 'Prediction') : undefined}>
                    <Avatar name={names[seat]} seat={seat} size="sm" className="rounded-full ring-2 ring-white" />
                  </span>
                ))}
              </span>
            </li>
          );
        })}
      </ul>

      <p className={`text-[1.05rem] font-medium ${v.same ? 'text-accent-deep' : 'text-ink'}`}>{v.text}</p>
      {predictive && (
        <p className="text-sm text-ink-mute">
          Prediction score, just for fun: {([me, partner] as PlayerNumber[]).map((seat) => `${seat === me ? 'You' : names[seat]} ${score[seat].right}/${score[seat].tries}`).join(', ')}. It says nothing about your relationship.
        </p>
      )}

      {([me, partner] as PlayerNumber[])
        .filter((seat) => pair[seat].payload.note)
        .map((seat) => (
          <p key={seat} className="text-[0.95rem]">
            <span className={`font-medium ${seatTone[seat].text}`}>{seat === me ? 'You' : names[seat]}: </span>
            {pair[seat].payload.note}
          </p>
        ))}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon={<MessageCircleMore className="size-4" />} onClick={() => setMore((x) => !x)} aria-expanded={more}>
          <span className="inline-flex items-center gap-1 whitespace-nowrap">Tell me more <ChevronDown className={`size-3.5 transition-transform ${more ? 'rotate-180' : ''}`} aria-hidden="true" /></span>
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
        <div className="animate-rise space-y-4 rounded-[12px] bg-shell p-5">
          <div>
            <p className="text-xs font-medium tracking-wide text-ink-mute uppercase">Talk about it together</p>
            <p className="mt-1 font-medium text-ink">{q.followUp}</p>
          </div>
          {([me, partner] as PlayerNumber[])
            .filter((seat) => follow[seat])
            .map((seat) => (
              <div key={seat} className="rounded-[8px] bg-white p-3.5 shadow-hairline">
                <p className="text-xs text-ink-mute">{follow[seat]!.payload.prompt}</p>
                <p className="mt-1 text-[0.95rem]">
                  <span className={`font-medium ${seatTone[seat].text}`}>{seat === me ? 'You' : names[seat]}: </span>
                  {follow[seat]!.payload.text}
                </p>
              </div>
            ))}
          {!follow[me] && (
            <div className="space-y-2">
              <p className="text-sm text-ink">
                <span className="font-medium">For you, based on what you picked: </span>
                {myPrompt}
              </p>
              <TextAnswer label="Your follow-up answer" value={draft} onChange={setDraft} max={400} rows={3} placeholder="Answer if you like. Shared with your partner when you press Share." />
              {draft.trim() && (
                <Button size="sm" loading={busy === 'f'} onClick={() => run('f', () => s.submit(`pub:f${i}`, { prompt: myPrompt, text: draft.trim() }))}>
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
            if (i + 1 >= total) await s.complete();
          })
        }
      >
        {i + 1 >= total ? 'See your results' : 'Next question'}
      </Button>
    </div>
  );
}

/** Predictions by each seat: right / tries, from revealed Read My Mind rounds. */
function predictionScore(view: SessionView) {
  const out: Record<PlayerNumber, { right: number; tries: number }> = { 1: { right: 0, tries: 0 }, 2: { right: 0, tries: 0 } };
  for (const r of revealedRounds(view)) {
    if (r.q.kind !== 'predictive') continue;
    const predictor = other(answererFor(r.i));
    out[predictor].tries++;
    if (compare(r.a, r.b).same) out[predictor].right++;
  }
  return out;
}

function revealedRounds(view: SessionView) {
  const qs = readState(view).qs;
  const rows: { i: number; q: Mcq; a: string[]; b: string[]; notes: Partial<Record<PlayerNumber, string>> }[] = [];
  qs.forEach((id, i) => {
    const pair = entriesFor<Answer>(view, `seal:q${i}`);
    const q = mcqById(id);
    if (!q || !pair[1] || !pair[2]) return;
    rows.push({ i, q, a: pair[1].payload.picks, b: pair[2].payload.picks, notes: { 1: pair[1].payload.note, 2: pair[2].payload.note } });
  });
  return rows;
}

/* ------------------------------------------------------------------------- */

function Results({ view, s, exhausted }: ModeProps & { rounds: number; exhausted: boolean }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner = other(me);
  if (view.session.status !== 'completed') {
    return (
      <div className="space-y-4">
        {exhausted && <Note tone="pink">That's every question your shared boundaries and decks allow for now. You can widen them in Boundaries, or finish here.</Note>}
        <Button size="lg" block loading={busy === 'c'} onClick={() => run('c', () => s.complete())}>
          See your results
        </Button>
      </div>
    );
  }

  const st = readState(view);
  const rows = revealedRounds(view);
  const independent = rows.filter((r) => r.q.kind === 'independent');
  const same = independent.filter((r) => compare(r.a, r.b).same);
  const overlap = independent.filter((r) => !compare(r.a, r.b).same && compare(r.a, r.b).shared.length);
  const different = independent.filter((r) => !compare(r.a, r.b).shared.length);
  const favIds = new Set(entriesWithPrefix(view, 'pub:fav:').map((e) => e.key.slice('pub:fav:'.length)));
  const favourites = rows.filter((r) => favIds.has(r.q.id));
  const laterIdx = new Set(entriesWithPrefix(view, 'pub:later').filter((e) => /^pub:later\d+$/.test(e.key)).map((e) => Number(e.key.slice('pub:later'.length))));
  const later = rows.filter((r) => laterIdx.has(r.i));
  const reflections = entriesWithPrefix<FollowUp>(view, 'pub:f').filter((e) => /^pub:f\d+$/.test(e.key));
  const score = predictionScore(view);
  const optText = (q: Mcq, ids: string[]) => ids.map((id) => q.options.find((o) => o.id === id)?.text ?? id).join(' + ');
  const both = (r: (typeof rows)[number]) => (
    <>
      <p className="text-sm text-ink-mute">{r.q.text}</p>
      <p className="mt-1 text-sm">
        <span className={`font-medium ${seatTone[me].text}`}>You: </span>
        {optText(r.q, me === 1 ? r.a : r.b)}
      </p>
      <p className="mt-0.5 text-sm">
        <span className={`font-medium ${seatTone[partner].text}`}>{names[partner]}: </span>
        {optText(r.q, me === 1 ? r.b : r.a)}
      </p>
    </>
  );
  const highest = Math.max(1, ...rows.map((r) => r.q.level), st.level);
  const predictTries = score[1].tries + score[2].tries;

  return (
    <Recap
      view={view}
      mode="mcq"
      title="The Question Game"
      stats={[
        ['Answered together', rows.length],
        ['Same answer', same.length],
        ['Approached differently', different.length + overlap.length],
        ['Skipped', st.skipped.length],
      ]}
      momentTitle="Answers we shared"
      momentBody={same.map((r) => `${r.q.text}\n${optText(r.q, r.a)}`).join('\n\n')}
    >
      <section className="rounded-[12px] bg-white p-5 shadow-hairline">
        <h2 className="font-semibold">Summary</h2>
        <p className="mt-1.5 leading-relaxed text-ink-soft">
          You answered {rows.length} {rows.length === 1 ? 'question' : 'questions'} together and reached Level {highest}, {levelInfo(highest).title}.
          {same.length > 0 && ` You chose the same answer ${same.length} ${same.length === 1 ? 'time' : 'times'}.`}
          {different.length + overlap.length > 0 && ` ${different.length + overlap.length} ${different.length + overlap.length === 1 ? 'question was' : 'questions were'} approached differently, which is where the best conversations usually start.`}
          {predictTries > 0 && ` Prediction score, just for fun: you ${score[me].right}/${score[me].tries}, ${names[partner]} ${score[partner].right}/${score[partner].tries}.`}
        </p>
      </section>
      <RecapList title="Favourite answers" items={favourites.map(both)} />
      <RecapList
        title="Shared preferences"
        items={[...same, ...overlap].map((r) => {
          const c = compare(r.a, r.b);
          return (
            <>
              <p className="text-sm text-ink-mute">{r.q.text}</p>
              <p className="mt-1 font-medium">{optText(r.q, c.shared)}</p>
            </>
          );
        })}
      />
      <RecapList title="Different perspectives" items={[...different, ...overlap].map(both)} />
      <RecapList title="Worth discussing later" items={later.map((r) => <span className="font-medium">{r.q.text}</span>)} />
      <RecapList
        title="Reflections"
        items={[
          ...rows.flatMap((r) =>
            ([1, 2] as PlayerNumber[])
              .filter((seat) => r.notes[seat])
              .map((seat) => (
                <>
                  <p className="text-sm text-ink-mute">{r.q.text}</p>
                  <p className="mt-1 text-sm">
                    <span className={`font-medium ${seatTone[seat].text}`}>{seat === me ? 'You' : names[seat]}: </span>
                    {r.notes[seat]}
                  </p>
                </>
              )),
          ),
          ...reflections.map((e) => (
            <>
              <p className="text-sm text-ink-mute">{e.payload.prompt}</p>
              <p className="mt-1 text-sm">
                <span className={`font-medium ${seatTone[e.player_number].text}`}>{e.player_number === me ? 'You' : names[e.player_number]}: </span>
                {e.payload.text}
              </p>
            </>
          )),
        ]}
      />
      <p className="text-sm text-ink-mute">No scores for compatibility here. Different answers are just different answers.</p>
    </Recap>
  );
}
