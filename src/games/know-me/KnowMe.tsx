import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { AnswerPair, ChoiceList, Note, PromptHeading, SaveMoment, SectionTitle, StepProgress, TextAnswer, Waiting } from '../../components/session/Parts';
import { entriesFor, partnerHasPending, seatNames } from '../../hooks/useSession';
import { seededShuffle } from '../../lib/random';
import type { PlayerNumber } from '../../lib/types';
import { useBusy, useDraft, useJustRevealed, useStep } from '../flow';
import type { GameProps } from '../types';
import { KNOW_QUESTIONS, type KnowCategory, type KnowQuestion } from './content';

type Answer = { answer: string };

function questionsFor(sessionId: string, length: number): KnowQuestion[] {
  return seededShuffle(KNOW_QUESTIONS, sessionId).slice(0, Math.min(length, KNOW_QUESTIONS.length));
}
const answererFor = (i: number): PlayerNumber => (i % 2 === 0 ? 1 : 2);
const label = (q: KnowQuestion, v?: string) => (q.options ? (q.options.find((o) => o.id === v)?.label ?? v) : v) ?? '';

/** Choice questions match automatically; written answers are judged by the person who answered. */
function outcome(view: GameProps['view'], q: KnowQuestion, i: number): boolean | null {
  const pair = entriesFor<Answer>(view, `seal:k${i}`);
  if (!pair[1] || !pair[2]) return null;
  if (q.options) return pair[1].payload.answer === pair[2].payload.answer;
  const j = entriesFor<{ close: boolean }>(view, `pub:j${i}`)[answererFor(i)];
  return j ? j.payload.close : null;
}

export default function KnowMe({ view, s }: GameProps) {
  const length = Number(view.session.settings.length ?? 20);
  const questions = useMemo(() => questionsFor(view.session.id, length), [view.session.id, length]);
  const { step, next } = useStep(view, s);
  const names = seatNames(view);
  const me = view.me.player_number;

  if (view.session.status === 'completed' || step >= questions.length) {
    return <KnowMeResults view={view} s={s} questions={questions} />;
  }
  return <KnowMeStep key={step} view={view} s={s} q={questions[step]!} i={step} total={questions.length} names={names} me={me} onNext={next} />;
}

function KnowMeStep({
  view,
  s,
  q,
  i,
  total,
  names,
  me,
  onNext,
}: GameProps & { q: KnowQuestion; i: number; total: number; names: Record<PlayerNumber, string>; me: PlayerNumber; onNext: () => Promise<boolean> }) {
  const { busy, run } = useBusy();
  const answerer = answererFor(i);
  const predictor: PlayerNumber = answerer === 1 ? 2 : 1;
  const iAnswer = me === answerer;
  const key = `seal:k${i}`;
  const pair = entriesFor<Answer>(view, key);
  const mine = pair[me];
  const revealed = Boolean(pair[1] && pair[2]);
  const just = useJustRevealed(key, revealed);
  const [draft, setDraft] = useDraft<string>(key, '');
  const judged = outcome(view, q, i);
  const why = entriesFor<{ text: string }>(view, `pub:w${i}`)[answerer];
  const [whyDraft, setWhyDraft] = useDraft<string>(`w${i}`, '');
  const isLast = i + 1 >= total;

  const prompt = iAnswer ? q.you : q.them.replace('{name}', names[answerer]);

  return (
    <div>
      <StepProgress index={i} total={total} label={q.category} />

      <div className="mt-7 flex items-center gap-2.5 text-sm">
        <Avatar name={names[answerer]} seat={answerer} size="sm" />
        <span className="text-ink-soft">
          {iAnswer ? (
            <>
              <span className="font-medium text-ink">You answer</span> about yourself. {names[predictor]} predicts.
            </>
          ) : (
            <>
              <span className="font-medium text-ink">You predict</span> what {names[answerer]} will say.
            </>
          )}
        </span>
      </div>

      <PromptHeading>{prompt}</PromptHeading>

      <div className="mt-6 space-y-4" aria-live="polite">
        {!mine && (
          <>
            {q.options ? (
              <ChoiceList label="Your answer" options={q.options} value={draft || null} onChange={setDraft} />
            ) : (
              <TextAnswer
                label="Your answer"
                value={draft}
                onChange={setDraft}
                max={200}
                rows={2}
                placeholder={iAnswer ? 'Your honest answer' : `Your best guess for ${names[answerer]}`}
              />
            )}
            <Button size="lg" block disabled={!draft.trim()} loading={busy === 'lock'} onClick={() => run('lock', () => s.submit(key, { answer: draft.trim() }))}>
              {iAnswer ? 'Lock in my answer' : 'Lock in my prediction'}
            </Button>
            {partnerHasPending(view, key) && <p className="text-center text-sm text-ink-mute">{names[me === 1 ? 2 : 1]} has locked in.</p>}
          </>
        )}

        {mine && !revealed && <Waiting>Locked in. Waiting for {names[me === 1 ? 2 : 1]}.</Waiting>}

        {revealed && (
          <div className="space-y-4">
            <AnswerPair
              names={names}
              me={me}
              animate={just}
              render={(seat) => (
                <>
                  <span className="block text-xs font-medium text-ink-mute">{seat === answerer ? 'Answer' : 'Prediction'}</span>
                  <span className="mt-0.5 block font-medium">{label(q, pair[seat]!.payload.answer)}</span>
                </>
              )}
            />

            {judged === null && !q.options && (
              iAnswer ? (
                <div className="flex flex-col gap-2 rounded-[10px] bg-mist p-4 shadow-hairline sm:flex-row sm:items-center">
                  <p className="flex-1 text-sm text-ink">Did {names[predictor]} get it?</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" icon={<Check className="size-4" />} loading={busy === 'j1'} onClick={() => run('j1', () => s.submit(`pub:j${i}`, { close: true }))}>
                      Close enough
                    </Button>
                    <Button size="sm" variant="secondary" icon={<X className="size-4" />} loading={busy === 'j0'} onClick={() => run('j0', () => s.submit(`pub:j${i}`, { close: false }))}>
                      Not quite
                    </Button>
                  </div>
                </div>
              ) : (
                <Waiting>{names[answerer]} is deciding whether your prediction was close.</Waiting>
              )
            )}

            {judged !== null && (
              <Note tone={judged ? 'pink' : 'neutral'}>
                {judged
                  ? `${predictor === me ? 'You' : names[predictor]} knew this one.`
                  : `Something new to learn about ${answerer === me ? 'you' : names[answerer]}.`}
              </Note>
            )}

            {why ? (
              <div className="rounded-[10px] bg-white p-4 shadow-hairline">
                <p className="text-xs font-medium text-ink-mute">{answerer === me ? 'Your' : `${names[answerer]}'s`} explanation</p>
                <p className="mt-1">{why.payload.text}</p>
              </div>
            ) : (
              iAnswer && (
                <div className="space-y-2">
                  <TextAnswer label="Explain your answer" value={whyDraft} onChange={setWhyDraft} max={300} rows={2} placeholder="Add a little context (optional)" />
                  {whyDraft.trim() && (
                    <Button size="sm" variant="secondary" loading={busy === 'why'} onClick={() => run('why', () => s.submit(`pub:w${i}`, { text: whyDraft.trim() }))}>
                      Share explanation
                    </Button>
                  )}
                </div>
              )
            )}

            <Button size="lg" block disabled={judged === null} loading={busy === 'next'} onClick={() => run('next', async () => {
              await onNext();
              if (isLast) await s.complete();
            })}>
              {isLast ? 'See what you learned' : 'Next question'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function KnowMeResults({ view, s, questions }: GameProps & { questions: KnowQuestion[] }) {
  const names = seatNames(view);
  const me = view.me.player_number;
  const { busy, run } = useBusy();
  const played = questions.map((q, i) => ({ q, i, result: outcome(view, q, i) })).filter((x) => x.result !== null);

  if (view.session.status !== 'completed') {
    return (
      <div className="space-y-4">
        <PromptHeading>That was the last question.</PromptHeading>
        <Button size="lg" block loading={busy === 'c'} onClick={() => run('c', () => s.complete())}>
          See what you learned
        </Button>
      </div>
    );
  }

  const bySeat = ([1, 2] as PlayerNumber[]).map((predictor) => {
    const answerer: PlayerNumber = predictor === 1 ? 2 : 1;
    const mineQs = played.filter((x) => answererFor(x.i) === answerer);
    const cats = new Map<KnowCategory, { right: number; total: number }>();
    for (const x of mineQs) {
      const c = cats.get(x.q.category) ?? { right: 0, total: 0 };
      c.total++;
      if (x.result) c.right++;
      cats.set(x.q.category, c);
    }
    const strong = [...cats].filter(([, c]) => c.right === c.total).map(([k]) => k);
    const learn = [...cats].filter(([, c]) => c.right < c.total).map(([k]) => k);
    return { predictor, answerer, right: mineQs.filter((x) => x.result).length, total: mineQs.length, strong, learn };
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.025em]">What you learned</h1>
        <p className="mt-1.5 text-ink-soft">The numbers are just for fun. The answers are the interesting part.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {bySeat.map((b) => (
          <div key={b.predictor} className="rounded-[10px] bg-white p-5 shadow-hairline">
            <div className="flex items-center gap-2">
              <Avatar name={names[b.predictor]} seat={b.predictor} size="sm" />
              <p className="font-medium">{b.predictor === me ? 'You' : names[b.predictor]}</p>
            </div>
            <p className="tabular mt-3 text-[2rem] leading-none font-semibold tracking-tight">
              {b.right}
              <span className="text-lg text-ink-mute"> / {b.total}</span>
            </p>
            <p className="mt-1 text-sm text-ink-soft">predictions about {b.answerer === me ? 'you' : names[b.answerer]} were right</p>
            {b.strong.length > 0 && (
              <p className="mt-4 text-sm">
                <span className="font-medium">Knows well: </span>
                <span className="text-ink-soft">{b.strong.join(', ')}</span>
              </p>
            )}
            {b.learn.length > 0 && (
              <p className="mt-1 text-sm">
                <span className="font-medium">Room to learn: </span>
                <span className="text-ink-soft">{b.learn.join(', ')}</span>
              </p>
            )}
          </div>
        ))}
      </div>

      <section>
        <SectionTitle aside={<SaveMoment game="know_me" sessionId={view.session.id} defaultTitle="How well we know each other" />}>Every answer</SectionTitle>
        <ol className="divide-y divide-line rounded-[10px] bg-white shadow-hairline">
          {played.map(({ q, i, result }) => {
            const answerer = answererFor(i);
            const pair = entriesFor<Answer>(view, `seal:k${i}`);
            const why = entriesFor<{ text: string }>(view, `pub:w${i}`)[answerer];
            return (
              <li key={q.id} className="px-4 py-4 sm:px-5">
                <p className="text-sm text-ink-mute">{q.them.replace('{name}', answerer === me ? 'you' : names[answerer])}</p>
                <p className="mt-1">
                  <span className="font-medium">{label(q, pair[answerer]?.payload.answer)}</span>
                  <span className="text-ink-mute"> &nbsp;predicted: </span>
                  <span>{label(q, pair[answerer === 1 ? 2 : 1]?.payload.answer)}</span>
                </p>
                {why && <p className="mt-1 text-sm text-ink-soft">{why.payload.text}</p>}
                <p className={`mt-1.5 text-xs font-medium ${result ? 'text-success' : 'text-ink-mute'}`}>{result ? 'Matched' : 'Different'}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <Note>
        This might be worth talking about: pick one answer that surprised you and ask why.
      </Note>
    </div>
  );
}
