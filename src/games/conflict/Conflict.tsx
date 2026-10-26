import { useMemo } from 'react';
import { Button } from '../../components/ui/Button';
import { AnswerPair, ChoiceList, Note, PromptHeading, SaveMoment, SectionTitle, StepProgress, Waiting } from '../../components/session/Parts';
import { entriesFor, partnerHasPending, seatNames } from '../../hooks/useSession';
import { seededShuffle } from '../../lib/random';
import type { PlayerNumber } from '../../lib/types';
import { useBusy, useDraft, useJustRevealed, useStep } from '../flow';
import type { GameProps } from '../types';
import { CONFLICT_SCENARIOS, NEEDS, REFLECTIONS, STYLES, type ConflictScenario, type Need, type Style } from './content';

type Resp = { response: number; need: Need };
const needLabel = (n: Need) => NEEDS.find((x) => x.id === n)?.label ?? n;

export default function Conflict({ view, s }: GameProps) {
  const count = Number(view.session.settings.count ?? 8);
  const scenarios = useMemo(() => seededShuffle(CONFLICT_SCENARIOS, view.session.id).slice(0, count), [view.session.id, count]);
  const { step, next } = useStep(view, s);
  if (view.session.status === 'completed' || step >= scenarios.length) return <ConflictSummary view={view} s={s} scenarios={scenarios} />;
  return <ConflictStep key={step} view={view} s={s} sc={scenarios[step]!} i={step} total={scenarios.length} onNext={next} />;
}

function ConflictStep({ view, s, sc, i, total, onNext }: GameProps & { sc: ConflictScenario; i: number; total: number; onNext: () => Promise<boolean> }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner: PlayerNumber = me === 1 ? 2 : 1;
  const key = `seal:c${i}`;
  const pair = entriesFor<Resp>(view, key);
  const revealed = Boolean(pair[1] && pair[2]);
  const just = useJustRevealed(key, revealed);
  const [resp, setResp] = useDraft<string>(key, '');
  const [need, setNeed] = useDraft<string>(`${key}:n`, '');
  const [reflection, setReflection] = useDraft(`${key}:r`, 0);
  const isLast = i + 1 >= total;

  return (
    <div>
      <StepProgress index={i} total={total} label={sc.theme} />
      <div className="mt-8 border-l-2 border-accent pl-4">
        <p className="text-sm font-medium text-ink-mute">The situation</p>
        <p className="mt-1 text-[1.1rem] leading-relaxed text-ink">{sc.situation}</p>
      </div>
      <PromptHeading>{sc.question}</PromptHeading>

      <div className="mt-6 space-y-5" aria-live="polite">
        {!pair[me] && (
          <>
            <ChoiceList label="Your response" options={sc.responses.map((r, j) => ({ id: String(j), label: r.text }))} value={resp || null} onChange={setResp} />
            <div>
              <p className="mb-2 text-sm font-medium">What do you think the other person needs most?</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What they need">
                {NEEDS.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    role="radio"
                    aria-checked={need === n.id}
                    onClick={() => setNeed(n.id)}
                    className={`rounded-[6px] px-3 py-2 text-sm transition-colors ${
                      need === n.id ? 'bg-shell font-medium text-accent-deep shadow-[0_0_0_1.5px_var(--color-accent)]' : 'bg-white shadow-[0_0_0_1px_var(--color-line-strong)] hover:bg-mist'
                    }`}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
            <Button size="lg" block disabled={!resp || !need} loading={busy === 'save'} onClick={() => run('save', () => s.submit(key, { response: Number(resp), need }))}>
              Lock in
            </Button>
            {partnerHasPending(view, key) && <p className="text-center text-sm text-ink-mute">{names[partner]} has answered.</p>}
          </>
        )}
        {pair[me] && !revealed && <Waiting>Locked in. Waiting for {names[partner]}.</Waiting>}
        {revealed && (
          <>
            <AnswerPair
              names={names}
              me={me}
              animate={just}
              render={(seat) => {
                const r = pair[seat]!.payload;
                const st = sc.responses[r.response]!.style;
                return (
                  <>
                    <span className="block font-medium">{sc.responses[r.response]!.text}</span>
                    <span className="mt-2 block text-xs text-ink-mute">
                      Style: <span className="text-ink-soft">{STYLES[st].label}</span>
                    </span>
                    <span className="block text-xs text-ink-mute">
                      Thinks they need: <span className="text-ink-soft">{needLabel(r.need)}</span>
                    </span>
                  </>
                );
              }}
            />
            <p className="text-sm text-ink-soft">
              {sc.responses[pair[1]!.payload.response]!.style === sc.responses[pair[2]!.payload.response]!.style
                ? 'You reached for the same approach.'
                : 'You may express this need in different ways. Neither approach is wrong.'}
            </p>

            <div className="rounded-[10px] bg-shell p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-accent-deep">Reflect together</p>
                <p className="tabular text-xs text-ink-mute">
                  {reflection + 1} of {REFLECTIONS.length}
                </p>
              </div>
              <p key={reflection} className="mt-2 animate-rise text-[1.05rem] text-ink">
                {REFLECTIONS[reflection]}
              </p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="secondary" disabled={reflection === 0} onClick={() => setReflection(reflection - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="secondary" disabled={reflection === REFLECTIONS.length - 1} onClick={() => setReflection(reflection + 1)}>
                  Next prompt
                </Button>
              </div>
            </div>

            <Button size="lg" block loading={busy === 'next'} onClick={() => run('next', async () => {
              await onNext();
              if (isLast) await s.complete();
            })}>
              {isLast ? 'See your styles' : 'Next scenario'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function ConflictSummary({ view, s, scenarios }: GameProps & { scenarios: ConflictScenario[] }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  if (view.session.status !== 'completed') {
    return (
      <div className="space-y-4">
        <PromptHeading>That was the last scenario.</PromptHeading>
        <Button size="lg" block loading={busy === 'c'} onClick={() => run('c', () => s.complete())}>
          See your styles
        </Button>
      </div>
    );
  }
  const rows = scenarios.map((sc, i) => ({ sc, pair: entriesFor<Resp>(view, `seal:c${i}`) })).filter((r) => r.pair[1] && r.pair[2]);
  const counts = (seat: PlayerNumber) => {
    const c: Record<Style, number> = { talk: 0, pause: 0, write: 0, repair: 0 };
    for (const r of rows) c[r.sc.responses[r.pair[seat]!.payload.response]!.style]++;
    return c;
  };
  const sameNeed = rows.filter((r) => r.pair[1]!.payload.need === r.pair[2]!.payload.need).length;
  const order: PlayerNumber[] = me === 1 ? [1, 2] : [2, 1];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.025em]">How you each handle the hard moments</h1>
        <p className="mt-1.5 text-ink-soft">
          These are fictional situations, so treat this as a starting point. Different styles are normal, not a sign of incompatibility.
        </p>
      </div>
      <section>
        <SectionTitle>Approaches you reached for</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {order.map((seat) => {
            const c = counts(seat);
            const max = Math.max(1, ...Object.values(c));
            return (
              <div key={seat} className="rounded-[10px] bg-white p-5 shadow-hairline">
                <p className="font-medium">{seat === me ? 'You' : names[seat]}</p>
                <ul className="mt-3 space-y-2.5">
                  {(Object.keys(STYLES) as Style[]).map((st) => (
                    <li key={st}>
                      <div className="flex justify-between text-sm">
                        <span>{STYLES[st].label}</span>
                        <span className="tabular text-ink-mute">{c[st]}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-[2px] bg-line">
                        <div className="h-full rounded-[2px] bg-accent" style={{ width: `${(c[st] / max) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
      <Note tone="pink">
        You picked the same underlying need in {sameNeed} of {rows.length} situations. Where you differed, it might be worth
        asking: "When I'm upset, what do you think I need?"
      </Note>
      <div className="flex justify-end">
        <SaveMoment game="conflict" sessionId={view.session.id} defaultTitle="How we handle hard moments" />
      </div>
    </div>
  );
}
