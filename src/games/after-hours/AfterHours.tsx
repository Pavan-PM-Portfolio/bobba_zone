import { useMemo } from 'react';
import { EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { AnswerPair, ChoiceList, Note, PromptHeading, SaveMoment, SectionTitle, StepProgress, TextAnswer, Waiting } from '../../components/session/Parts';
import { entriesFor, partnerHasPending, seatNames } from '../../hooks/useSession';
import { seededShuffle } from '../../lib/random';
import type { PlayerNumber } from '../../lib/types';
import { useBusy, useDraft, useJustRevealed, useStep } from '../flow';
import type { GameProps } from '../types';
import { LEVELS, levelByN } from './content';

type Ans = { text?: string; skipped?: boolean };
const PROMPTS_PER_GAME = 10;

export default function AfterHours({ view, s }: GameProps) {
  const me = view.me.player_number;
  const levels = entriesFor<{ level: number }>(view, 'seal:level');
  const agreed = levels[1] && levels[2] ? Math.min(levels[1].payload.level, levels[2].payload.level) : null;
  const level = agreed ? levelByN(agreed) : null;
  const prompts = useMemo(
    () => (level ? seededShuffle(level.prompts, `${view.session.id}:${level.n}`).slice(0, PROMPTS_PER_GAME) : []),
    [level, view.session.id],
  );
  const { step, next } = useStep(view, s);

  if (!level) return <ChooseLevel view={view} s={s} mine={levels[me]?.payload.level} />;
  if (view.session.status === 'completed' || step >= prompts.length) return <Summary view={view} s={s} prompts={prompts} levelTitle={level.title} />;
  return <PromptStep key={step} view={view} s={s} i={step} prompt={prompts[step]!} total={prompts.length} levelTitle={level.title} onNext={next} />;
}

function ChooseLevel({ view, s, mine }: GameProps & { mine?: number }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const partner: PlayerNumber = view.me.player_number === 1 ? 2 : 1;
  const [choice, setChoice] = useDraft<string>('level', '');
  return (
    <div>
      <PromptHeading eyebrow="Before you begin">Choose the level you're comfortable with tonight.</PromptHeading>
      <p className="mt-3 text-ink-soft">
        You each choose privately. The game uses the gentler of your two choices, and only that agreed level is shown, so
        nobody is put on the spot.
      </p>
      <div className="mt-6 space-y-4">
        {mine ? (
          <Waiting>Your choice is in. Waiting for {names[partner]}.</Waiting>
        ) : (
          <>
            <ChoiceList
              label="Comfort level"
              options={LEVELS.map((l) => ({ id: String(l.n), label: l.title, detail: l.detail }))}
              value={choice || null}
              onChange={setChoice}
            />
            <Button size="lg" block disabled={!choice} loading={busy === 'l'} onClick={() => run('l', () => s.submit('seal:level', { level: Number(choice) }))}>
              Confirm my level
            </Button>
          </>
        )}
        <Note>
          <span className="flex gap-2.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            Every question can be skipped, and answers are only shown if you both choose to share them.
          </span>
        </Note>
      </div>
    </div>
  );
}

function PromptStep({
  view,
  s,
  i,
  prompt,
  total,
  levelTitle,
  onNext,
}: GameProps & { i: number; prompt: { text: string; followUp: string }; total: number; levelTitle: string; onNext: () => Promise<boolean> }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner: PlayerNumber = me === 1 ? 2 : 1;
  const key = `gated:a${i}`;
  const okKey = `ok:a${i}`;
  const answers = entriesFor<Ans>(view, key);
  const consents = entriesFor<{ share: boolean }>(view, okKey);
  const privacy = entriesFor<{ keep: boolean }>(view, `pub:priv${i}`);
  const [draft, setDraft] = useDraft(key, '');

  const mine = answers[me];
  const bothAnswered = Boolean(mine) && (Boolean(answers[partner]) || partnerHasPending(view, key));
  const revealed = Boolean(answers[1] && answers[2]);
  const someoneKeptPrivate = Boolean(privacy[1]?.payload.keep || privacy[2]?.payload.keep);
  const iDecided = Boolean(consents[me] || privacy[me]);
  const just = useJustRevealed(key, revealed);
  const isLast = i + 1 >= total;

  const next = (
    <Button size="lg" block loading={busy === 'next'} onClick={() => run('next', async () => {
      await onNext();
      if (isLast) await s.complete();
    })}>
      {isLast ? 'Finish' : 'Next question'}
    </Button>
  );

  return (
    <div>
      <StepProgress index={i} total={total} label={levelTitle} />
      <PromptHeading>{prompt.text}</PromptHeading>

      <div className="mt-6 space-y-4" aria-live="polite">
        {!mine && (
          <>
            <TextAnswer label="Your answer" value={draft} onChange={setDraft} max={500} rows={4} placeholder="Only you can see this unless you both choose to share." />
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
              <Button size="lg" variant="ghost" loading={busy === 'skip'} onClick={() => run('skip', () => s.submit(key, { skipped: true }))}>
                Skip, no reason needed
              </Button>
              <Button size="lg" block className="sm:flex-1" disabled={!draft.trim()} loading={busy === 'a'} onClick={() => run('a', () => s.submit(key, { text: draft.trim() }))}>
                Save my answer
              </Button>
            </div>
          </>
        )}

        {mine && !bothAnswered && <Waiting>Saved privately. Waiting for {names[partner]}.</Waiting>}

        {bothAnswered && !revealed && !someoneKeptPrivate && (
          iDecided ? (
            <Waiting>Waiting for {names[partner]} to decide whether to share.</Waiting>
          ) : (
            <div className="rounded-[10px] bg-white p-5 shadow-hairline">
              <p className="flex items-center gap-2 font-medium">
                <LockKeyhole className="size-4 text-accent" aria-hidden="true" /> You have both answered.
              </p>
              <p className="mt-1 text-sm text-ink-soft">Answers are shown only if you both agree. Keeping yours private is completely fine.</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button variant="secondary" icon={<EyeOff className="size-4" />} loading={busy === 'priv'} onClick={() => run('priv', () => s.submit(`pub:priv${i}`, { keep: true }))}>
                  Keep private
                </Button>
                <Button loading={busy === 'share'} onClick={() => run('share', () => s.submit(okKey, { share: true }))}>
                  Share answers
                </Button>
              </div>
            </div>
          )
        )}

        {someoneKeptPrivate && !revealed && (
          <>
            <Note>These answers stay private. Nothing more to do here.</Note>
            {next}
          </>
        )}

        {revealed && (
          <>
            <AnswerPair
              names={names}
              me={me}
              animate={just}
              render={(seat) =>
                answers[seat]!.payload.skipped ? <span className="text-ink-mute italic">Skipped</span> : <span className="whitespace-pre-line">{answers[seat]!.payload.text}</span>
              }
            />
            <Note tone="pink">
              <span className="font-medium">If you like: </span>
              {prompt.followUp}
            </Note>
            {next}
          </>
        )}
      </div>
    </div>
  );
}

function Summary({ view, s, prompts, levelTitle }: GameProps & { prompts: { text: string; followUp: string }[]; levelTitle: string }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;

  if (view.session.status !== 'completed') {
    return (
      <div className="space-y-4">
        <PromptHeading>That's the end of tonight's questions.</PromptHeading>
        <Button size="lg" block loading={busy === 'c'} onClick={() => run('c', () => s.complete())}>
          Finish
        </Button>
      </div>
    );
  }

  const shared = prompts
    .map((p, i) => ({ p, i, a: entriesFor<Ans>(view, `gated:a${i}`) }))
    .filter((x) => x.a[1] && x.a[2]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.025em]">Tonight, at {levelTitle.toLowerCase()}</h1>
        <p className="mt-1.5 text-ink-soft">
          You shared {shared.length} of {prompts.length} answers. Anything kept private stays that way.
        </p>
      </div>
      {shared.length > 0 ? (
        <section>
          <SectionTitle>What you shared</SectionTitle>
          <div className="space-y-4">
            {shared.map((x) => (
              <div key={x.i} className="space-y-3">
                <p className="font-medium">{x.p.text}</p>
                <AnswerPair
                  names={names}
                  me={me}
                  render={(seat) => (x.a[seat]!.payload.skipped ? <span className="text-ink-mute italic">Skipped</span> : <span className="whitespace-pre-line">{x.a[seat]!.payload.text}</span>)}
                />
              </div>
            ))}
          </div>
          <div className="mt-5">
            <SaveMoment game="after_hours" sessionId={view.session.id} defaultTitle={`After Hours, ${levelTitle.toLowerCase()}`} />
          </div>
        </section>
      ) : (
        <Note>Nothing was shared this time, which is completely fine.</Note>
      )}
    </div>
  );
}
