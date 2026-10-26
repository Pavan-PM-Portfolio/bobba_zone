import { useMemo } from 'react';
import { MessagesSquare } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { AnswerPair, ChoiceList, Note, PromptHeading, SameDiff, SaveMoment, SectionTitle, StepProgress, TextAnswer, Waiting } from '../../components/session/Parts';
import { entriesFor, partnerHasPending, seatNames } from '../../hooks/useSession';
import { seededShuffle } from '../../lib/random';
import type { PlayerNumber } from '../../lib/types';
import { useBusy, useDraft, useJustRevealed, useStep } from '../flow';
import type { GameProps } from '../types';
import { TRUST_SCENARIOS, type TrustScenario } from './content';

type Resp = { choice: number; words?: string };

export default function Trust({ view, s }: GameProps) {
  const count = Number(view.session.settings.count ?? 10);
  const scenarios = useMemo(() => seededShuffle(TRUST_SCENARIOS, view.session.id).slice(0, count), [view.session.id, count]);
  const { step, next } = useStep(view, s);
  if (view.session.status === 'completed' || step >= scenarios.length) return <TrustSummary view={view} s={s} scenarios={scenarios} />;
  return <Scenario key={step} view={view} s={s} sc={scenarios[step]!} i={step} total={scenarios.length} onNext={next} />;
}

function Scenario({ view, s, sc, i, total, onNext }: GameProps & { sc: TrustScenario; i: number; total: number; onNext: () => Promise<boolean> }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner: PlayerNumber = me === 1 ? 2 : 1;
  const key = `seal:t${i}`;
  const pair = entriesFor<Resp>(view, key);
  const revealed = Boolean(pair[1] && pair[2]);
  const just = useJustRevealed(key, revealed);
  const [choice, setChoice] = useDraft<string>(key, '');
  const [words, setWords] = useDraft(`${key}:w`, '');
  const talked = entriesFor<{ done: boolean }>(view, `pub:talk${i}`);
  const discussed = Boolean(talked[1]?.payload.done || talked[2]?.payload.done);
  const isLast = i + 1 >= total;

  return (
    <div>
      <StepProgress index={i} total={total} label={sc.theme} />
      <div className="mt-8 rounded-[10px] bg-white p-5 shadow-hairline sm:p-6">
        <p className="text-sm font-medium text-accent">Scenario</p>
        <h1 id="prompt" tabIndex={-1} className="mt-1.5 text-[1.35rem] leading-snug font-semibold tracking-[-0.015em] outline-none sm:text-[1.55rem]">
          {sc.text}
        </h1>
      </div>

      <div className="mt-6 space-y-4" aria-live="polite">
        {!pair[me] && (
          <>
            <ChoiceList label="Your response" options={sc.options.map((o, j) => ({ id: String(j), label: o }))} value={choice || null} onChange={setChoice} />
            <TextAnswer label="In your own words" value={words} onChange={setWords} max={300} rows={2} placeholder="In your own words (optional)" />
            <Button size="lg" block disabled={!choice} loading={busy === 'save'} onClick={() => run('save', () => s.submit(key, { choice: Number(choice), ...(words.trim() ? { words: words.trim() } : {}) }))}>
              Lock in my response
            </Button>
            {partnerHasPending(view, key) && <p className="text-center text-sm text-ink-mute">{names[partner]} has responded.</p>}
          </>
        )}
        {pair[me] && !revealed && <Waiting>Locked in. Waiting for {names[partner]}.</Waiting>}
        {revealed && (
          <>
            <AnswerPair
              names={names}
              me={me}
              animate={just}
              render={(seat) => (
                <>
                  <span className="block font-medium">{sc.options[pair[seat]!.payload.choice]}</span>
                  {pair[seat]!.payload.words && <span className="mt-1.5 block text-sm text-ink-soft">“{pair[seat]!.payload.words}”</span>}
                </>
              )}
            />
            <SameDiff same={pair[1]!.payload.choice === pair[2]!.payload.choice} diffText="You saw this differently. There's no right answer here." />
            <div className="rounded-[10px] bg-shell p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-accent-deep">
                <MessagesSquare className="size-4" aria-hidden="true" /> Talk it through
              </p>
              <ul className="mt-2 space-y-1.5">
                {sc.talk.map((t) => (
                  <li key={t} className="text-ink">
                    {t}
                  </li>
                ))}
              </ul>
              <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={discussed}
                  onChange={(e) => run('t', () => s.submit(`pub:talk${i}`, { done: e.target.checked }))}
                  className="size-4 accent-[var(--color-accent)]"
                />
                We've talked about this
              </label>
            </div>
            <Button size="lg" block loading={busy === 'next'} onClick={() => run('next', async () => {
              await onNext();
              if (isLast) await s.complete();
            })}>
              {isLast ? 'See the overview' : 'Next scenario'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function TrustSummary({ view, s, scenarios }: GameProps & { scenarios: TrustScenario[] }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  if (view.session.status !== 'completed') {
    return (
      <div className="space-y-4">
        <PromptHeading>That was the last scenario.</PromptHeading>
        <Button size="lg" block loading={busy === 'c'} onClick={() => run('c', () => s.complete())}>
          See the overview
        </Button>
      </div>
    );
  }
  const rows = scenarios
    .map((sc, i) => ({ sc, i, pair: entriesFor<Resp>(view, `seal:t${i}`), talk: entriesFor<{ done: boolean }>(view, `pub:talk${i}`) }))
    .filter((r) => r.pair[1] && r.pair[2]);
  const differ = rows.filter((r) => r.pair[1]!.payload.choice !== r.pair[2]!.payload.choice);
  const agree = rows.filter((r) => r.pair[1]!.payload.choice === r.pair[2]!.payload.choice);
  const openTalks = differ.filter((r) => !(r.talk[1]?.payload.done || r.talk[2]?.payload.done));

  const List = ({ items }: { items: typeof rows }) => (
    <ul className="divide-y divide-line rounded-[10px] bg-white shadow-hairline">
      {items.map((r) => (
        <li key={r.sc.id} className="px-4 py-4 sm:px-5">
          <p className="font-medium">{r.sc.text}</p>
          {([me, me === 1 ? 2 : 1] as PlayerNumber[]).map((seat) => (
            <p key={seat} className="mt-1 text-sm text-ink-soft">
              <span className="font-medium text-ink">{seat === me ? 'You' : names[seat]}:</span> {r.sc.options[r.pair[seat]!.payload.choice]}
            </p>
          ))}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.025em]">Your expectations, side by side</h1>
        <p className="mt-1.5 text-ink-soft">
          This is a conversation game, not a test. Different answers show where it helps to agree on expectations, nothing more.
        </p>
      </div>
      {openTalks.length > 0 && (
        <Note tone="pink">
          You saw {openTalks.length === 1 ? 'one scenario' : `${openTalks.length} scenarios`} differently and haven't marked {openTalks.length === 1 ? 'it' : 'them'} as discussed yet. They might be worth a conversation.
        </Note>
      )}
      {differ.length > 0 && (
        <section>
          <SectionTitle>You saw these differently</SectionTitle>
          <List items={differ} />
        </section>
      )}
      {agree.length > 0 && (
        <section>
          <SectionTitle aside={<SaveMoment game="trust" sessionId={view.session.id} defaultTitle="What we agreed on" defaultBody={agree.map((r) => `${r.sc.text} ${r.sc.options[r.pair[1]!.payload.choice]}`).join('\n')} />}>
            You agreed on these
          </SectionTitle>
          <List items={agree} />
        </section>
      )}
    </div>
  );
}
