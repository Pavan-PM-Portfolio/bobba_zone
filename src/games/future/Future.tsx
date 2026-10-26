import { useMemo } from 'react';
import { Button } from '../../components/ui/Button';
import { AnswerPair, ChoiceList, Note, PromptHeading, SameDiff, SaveMoment, SectionTitle, StepProgress, TextAnswer, Waiting } from '../../components/session/Parts';
import { entriesFor, partnerHasPending, seatNames } from '../../hooks/useSession';
import type { PlayerNumber } from '../../lib/types';
import { useBusy, useDraft, useJustRevealed, useStep } from '../flow';
import type { GameProps } from '../types';
import { IMPORTANCE, futurePrompts, type FuturePrompt, type Importance } from './content';

type Pick = { choice: number; importance: Importance; note?: string };
const impLabel = (i: Importance) => IMPORTANCE.find((x) => x.id === i)?.label ?? '';

export default function Future({ view, s }: GameProps) {
  const areas = view.session.settings.areas as string[] | undefined;
  const prompts = useMemo(() => futurePrompts(areas), [areas]);
  const { step, next } = useStep(view, s);
  if (view.session.status === 'completed' || step >= prompts.length) return <FutureSummary view={view} s={s} prompts={prompts} />;
  return <FutureStep key={step} view={view} s={s} p={prompts[step]!} total={prompts.length} onNext={next} />;
}

function FutureStep({ view, s, p, total, onNext }: GameProps & { p: FuturePrompt; total: number; onNext: () => Promise<boolean> }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner: PlayerNumber = me === 1 ? 2 : 1;
  const key = `seal:f${p.index}`;
  const pair = entriesFor<Pick>(view, key);
  const revealed = Boolean(pair[1] && pair[2]);
  const just = useJustRevealed(key, revealed);
  const [choice, setChoice] = useDraft<string>(key, '');
  const [imp, setImp] = useDraft<string>(`${key}:imp`, '');
  const [note, setNote] = useDraft(`${key}:note`, '');
  const isLast = p.index + 1 >= total;

  return (
    <div>
      <StepProgress index={p.index} total={total} label={p.area.title} />
      <PromptHeading>{p.text}</PromptHeading>

      <div className="mt-6 space-y-5" aria-live="polite">
        {!pair[me] && (
          <>
            <ChoiceList label="Your choice" options={p.options.map((o, i) => ({ id: String(i), label: o }))} value={choice || null} onChange={setChoice} />
            <div>
              <p className="mb-2 text-sm font-medium">How much does this matter to you?</p>
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Importance">
                {IMPORTANCE.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    role="radio"
                    aria-checked={imp === x.id}
                    onClick={() => setImp(x.id)}
                    className={`rounded-[6px] px-3 py-2.5 text-left text-sm transition-colors ${
                      imp === x.id ? 'bg-shell font-medium text-accent-deep shadow-[0_0_0_1.5px_var(--color-accent)]' : 'bg-white text-ink shadow-[0_0_0_1px_var(--color-line-strong)] hover:bg-mist'
                    }`}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
            <TextAnswer label="Add a note" value={note} onChange={setNote} max={240} rows={2} placeholder="Add a note (optional)" />
            <Button
              size="lg"
              block
              disabled={!choice || !imp}
              loading={busy === 'save'}
              onClick={() => run('save', () => s.submit(key, { choice: Number(choice), importance: imp, ...(note.trim() ? { note: note.trim() } : {}) }))}
            >
              Lock in my choice
            </Button>
            {partnerHasPending(view, key) && <p className="text-center text-sm text-ink-mute">{names[partner]} has chosen.</p>}
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
                const a = pair[seat]!.payload;
                return (
                  <>
                    <span className="block font-medium">{p.options[a.choice]}</span>
                    <span className="mt-1 inline-block rounded-[4px] bg-mist px-1.5 py-0.5 text-xs text-ink-soft">{impLabel(a.importance)}</span>
                    {a.note && <span className="mt-2 block text-sm text-ink-soft">{a.note}</span>}
                  </>
                );
              }}
            />
            <SameDiff same={pair[1]!.payload.choice === pair[2]!.payload.choice} diffText="You saw this differently. That's useful to know." />
            {p.lastInArea && (
              <Note tone="pink">
                <span className="font-medium">To talk about: </span>
                {p.area.talk}
              </Note>
            )}
            <Button size="lg" block loading={busy === 'next'} onClick={() => run('next', async () => {
              await onNext();
              if (isLast) await s.complete();
            })}>
              {isLast ? 'See the overview' : 'Next'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function FutureSummary({ view, s, prompts }: GameProps & { prompts: FuturePrompt[] }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  if (view.session.status !== 'completed') {
    return (
      <div className="space-y-4">
        <PromptHeading>That was the last question.</PromptHeading>
        <Button size="lg" block loading={busy === 'c'} onClick={() => run('c', () => s.complete())}>
          See the overview
        </Button>
      </div>
    );
  }
  const rows = prompts
    .map((p) => ({ p, pair: entriesFor<Pick>(view, `seal:f${p.index}`) }))
    .filter((r) => r.pair[1] && r.pair[2])
    .map((r) => ({ ...r, a: r.pair[1]!.payload, b: r.pair[2]!.payload }));
  const aligned = rows.filter((r) => r.a.choice === r.b.choice);
  const different = rows.filter((r) => r.a.choice !== r.b.choice);
  const bothImportant = rows.filter((r) => r.a.importance === 'important' && r.b.importance === 'important');

  const Row = ({ r }: { r: (typeof rows)[number] }) => (
    <li className="px-4 py-3.5 sm:px-5">
      <p className="text-sm text-ink-mute">{r.p.area.title}</p>
      <p className="mt-0.5 font-medium">{r.p.text}</p>
      {r.a.choice === r.b.choice ? (
        <p className="mt-1 text-ink-soft">Both: {r.p.options[r.a.choice]}</p>
      ) : (
        <p className="mt-1 text-ink-soft">
          {me === 1 ? 'You' : names[1]}: {r.p.options[r.a.choice]}
          <br />
          {me === 2 ? 'You' : names[2]}: {r.p.options[r.b.choice]}
        </p>
      )}
    </li>
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.025em]">Your future, side by side</h1>
        <p className="mt-1.5 text-ink-soft">
          There's no compatibility score here. Differences aren't problems; they're the things worth planning around together.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          ['Aligned', aligned.length],
          ['Seen differently', different.length],
          ['Important to both', bothImportant.length],
        ].map(([l, n]) => (
          <div key={l as string} className="rounded-[10px] bg-white p-4 shadow-hairline">
            <p className="tabular text-2xl font-semibold">{n}</p>
            <p className="text-sm text-ink-soft">{l}</p>
          </div>
        ))}
      </div>
      {bothImportant.length > 0 && (
        <section>
          <SectionTitle>Important to both of you</SectionTitle>
          <ul className="divide-y divide-line rounded-[10px] bg-white shadow-hairline">{bothImportant.map((r) => <Row key={r.p.index} r={r} />)}</ul>
        </section>
      )}
      {different.length > 0 && (
        <section>
          <SectionTitle>This might be worth talking about</SectionTitle>
          <ul className="divide-y divide-line rounded-[10px] bg-white shadow-hairline">{different.map((r) => <Row key={r.p.index} r={r} />)}</ul>
        </section>
      )}
      {aligned.length > 0 && (
        <section>
          <SectionTitle aside={<SaveMoment game="future" sessionId={view.session.id} defaultTitle="Plans we share" defaultBody={aligned.map((r) => `${r.p.text} ${r.p.options[r.a.choice]}`).join('\n')} />}>
            Where you already agree
          </SectionTitle>
          <ul className="divide-y divide-line rounded-[10px] bg-white shadow-hairline">{aligned.map((r) => <Row key={r.p.index} r={r} />)}</ul>
        </section>
      )}
    </div>
  );
}
