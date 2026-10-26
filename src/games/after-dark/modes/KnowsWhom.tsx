import { useMemo } from 'react';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { AnswerPair, ChoiceList, Note, StepProgress, TextAnswer, Waiting } from '../../../components/session/Parts';
import { entriesFor, partnerHasPending, seatNames } from '../../../hooks/useSession';
import { seededShuffle } from '../../../lib/random';
import type { PlayerNumber } from '../../../lib/types';
import { useBusy, useDraft, useJustRevealed, useStep } from '../../flow';
import type { ModeProps } from '../AfterDark';
import { PREDICTIONS, type Prediction } from '../content/predict';
import { allowed } from '../content/taxonomy';
import { Recap, RecapList } from '../Recap';
import { playedIds, stablePool } from '../shared';

const ROUNDS = 10;
const BY_ID: Record<string, Prediction> = Object.fromEntries(PREDICTIONS.map((q) => [q.id, q]));
const answererFor = (i: number): PlayerNumber => (i % 2 === 0 ? 1 : 2);

export default function KnowsWhom({ view, s, terms }: ModeProps) {
  const played = playedIds(view, (i) => `seal:kw${i}`, ROUNDS);
  const qs = useMemo(
    () => stablePool(seededShuffle(PREDICTIONS.filter((q) => allowed(q, terms)), view.session.id), BY_ID, played, ROUNDS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view.session.id, terms, played.join('|')],
  );
  const { step, next } = useStep(view, s);
  if (view.session.status === 'completed' || (qs.length > 0 && step >= qs.length)) return <KnowsRecap view={view} s={s} terms={terms} qs={qs} />;
  if (!qs.length) return <Note tone="pink">No questions match your shared boundaries. Open Boundaries to include more categories.</Note>;
  return <KnowsStep key={step} view={view} s={s} terms={terms} q={qs[step]!} i={step} total={qs.length} onNext={next} />;
}

function KnowsStep({ view, s, q, i, total, onNext }: ModeProps & { q: Prediction; i: number; total: number; onNext: () => Promise<boolean> }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const answerer = answererFor(i);
  const predictor: PlayerNumber = answerer === 1 ? 2 : 1;
  const key = `seal:kw${i}`;
  const pair = entriesFor<{ c: number }>(view, key);
  const revealed = Boolean(pair[1] && pair[2]);
  const just = useJustRevealed(key, revealed);
  const [sel, setSel] = useDraft<string>(key, '');
  const why = entriesFor<{ text: string }>(view, `pub:kww${i}`)[answerer];
  const [whyDraft, setWhyDraft] = useDraft(`kww${i}`, '');
  const iAnswer = me === answerer;
  const matched = revealed && pair[1]!.payload.c === pair[2]!.payload.c;

  return (
    <div className="space-y-6">
      <StepProgress index={i} total={total} label="Who Knows Whom Better?" />
      <div className="flex items-center gap-2.5 text-sm text-ink-soft">
        <Avatar name={names[answerer]} seat={answerer} size="sm" />
        {iAnswer ? (
          <span>
            <span className="font-medium text-ink">You answer</span> about yourself. {names[predictor]} predicts.
          </span>
        ) : (
          <span>
            <span className="font-medium text-ink">You predict</span> {names[answerer]}'s answer.
          </span>
        )}
      </div>
      <h1 className="text-[1.5rem] leading-snug font-semibold tracking-[-0.02em]">{iAnswer ? q.you : q.them.replace('{name}', names[answerer])}</h1>

      {!pair[me] && (
        <>
          <ChoiceList label="Your answer" options={q.options.map((o, j) => ({ id: String(j), label: o }))} value={sel || null} onChange={setSel} />
          <Button size="lg" block disabled={!sel} loading={busy === 'l'} onClick={() => run('l', () => s.submit(key, { c: Number(sel), id: q.id }))}>
            {iAnswer ? 'Lock in my answer' : 'Lock in my prediction'}
          </Button>
          {partnerHasPending(view, key) && <p className="text-center text-sm text-ink-mute">{names[me === 1 ? 2 : 1]} has locked in.</p>}
        </>
      )}
      {pair[me] && !revealed && <Waiting>Locked in. Waiting for {names[me === 1 ? 2 : 1]}.</Waiting>}
      {revealed && (
        <div className="space-y-4">
          <AnswerPair
            names={names}
            me={me}
            animate={just}
            render={(seat) => (
              <>
                <span className="block text-xs text-ink-mute">{seat === answerer ? 'Answer' : 'Prediction'}</span>
                <span className="block font-medium">{q.options[pair[seat]!.payload.c]}</span>
              </>
            )}
          />
          <p className={`font-medium ${matched ? 'text-accent-deep' : 'text-ink'}`}>{matched ? 'Spot on.' : `Now you know something new about ${answerer === me ? 'you' : names[answerer]}.`}</p>
          {why ? (
            <p className="text-sm">
              <span className="font-medium">{answerer === me ? 'You' : names[answerer]}: </span>
              {why.payload.text}
            </p>
          ) : (
            iAnswer && (
              <div className="space-y-2">
                <TextAnswer label="Explain" value={whyDraft} onChange={setWhyDraft} max={240} rows={2} placeholder="Add a little context (optional)" />
                {whyDraft.trim() && (
                  <Button size="sm" variant="secondary" loading={busy === 'w'} onClick={() => run('w', () => s.submit(`pub:kww${i}`, { text: whyDraft.trim() }))}>
                    Share
                  </Button>
                )}
              </div>
            )
          )}
          <Note tone="pink">
            <span className="font-medium">Follow-up: </span>
            {q.talk}
          </Note>
          <Button size="lg" block loading={busy === 'n'} onClick={() => run('n', async () => {
            await onNext();
            if (i + 1 >= total) await s.complete();
          })}>
            {i + 1 >= total ? 'See the recap' : 'Next question'}
          </Button>
        </div>
      )}
    </div>
  );
}

function KnowsRecap({ view, s, qs }: ModeProps & { qs: Prediction[] }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  if (view.session.status !== 'completed') {
    return (
      <Button size="lg" block loading={busy === 'c'} onClick={() => run('c', () => s.complete())}>
        See the recap
      </Button>
    );
  }
  const rows = qs.map((q, i) => ({ q, i, pair: entriesFor<{ c: number }>(view, `seal:kw${i}`) })).filter((r) => r.pair[1] && r.pair[2]);
  const right = (predictor: PlayerNumber) => rows.filter((r) => answererFor(r.i) !== predictor && r.pair[1]!.payload.c === r.pair[2]!.payload.c).length;
  const total = (predictor: PlayerNumber) => rows.filter((r) => answererFor(r.i) !== predictor).length;
  return (
    <Recap
      view={view}
      mode="knows"
      title="Who Knows Whom Better?"
      stats={[
        [`${names[1]}'s predictions`, `${right(1)} / ${total(1)}`],
        [`${names[2]}'s predictions`, `${right(2)} / ${total(2)}`],
        ['Questions', rows.length],
        ['Explained', view.entries.filter((e) => e.key.startsWith('pub:kww')).length],
      ]}
      momentTitle="Who Knows Whom Better?"
    >
      <p className="text-sm text-ink-mute">Just for fun. A prediction score says nothing about love, attraction or commitment.</p>
      <RecapList
        title="Answers"
        items={rows.map((r) => {
          const a = answererFor(r.i);
          return (
            <>
              <p className="text-sm text-ink-mute">{r.q.them.replace('{name}', names[a])}</p>
              <p className="mt-0.5">{r.q.options[r.pair[a]!.payload.c]}</p>
            </>
          );
        })}
      />
    </Recap>
  );
}
