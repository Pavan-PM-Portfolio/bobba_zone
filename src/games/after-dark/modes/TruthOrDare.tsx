import { useMemo } from 'react';
import { Check, RefreshCw, SkipForward } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { AnswerPair, Note, StepProgress, TextAnswer, Waiting } from '../../../components/session/Parts';
import { entriesFor, entriesWithPrefix, partnerHasPending, seatNames } from '../../../hooks/useSession';
import type { PlayerNumber } from '../../../lib/types';
import { useBusy, useDraft, useJustRevealed } from '../../flow';
import type { ModeProps } from '../AfterDark';
import { DARES } from '../content/dares';
import { TRUTHS } from '../content/truths';
import { allowed, categoryTitle, type Prompt } from '../content/taxonomy';
import { Recap, RecapList } from '../Recap';
import { FavouriteButton, PromptCard, drawFrom } from '../shared';

type Kind = 'truth' | 'dare';
type Tod = { turn: number; current: { kind: Kind; id: string; alt: number } | null; used: string[] };
type Resp = { kind: Kind; id: string; status: 'answered' | 'done' | 'skipped'; text?: string };
const REACTIONS = ['Loved that', 'So bold', 'Made me blush', 'Tell me more', 'Save it for later'];
const ALL: Record<string, Prompt> = Object.fromEntries([...TRUTHS, ...DARES].map((p) => [p.id, p]));
const activeFor = (turn: number): PlayerNumber => (turn % 2 === 0 ? 1 : 2);
const isBothRound = (turn: number, canTruth: boolean) => canTruth && turn % 4 === 3;

export default function TruthOrDare({ view, s, terms }: ModeProps) {
  const rounds = Number(view.session.settings.rounds ?? 12);
  const tod = (view.session.state.tod as Tod | undefined) ?? { turn: 0, current: null, used: [] };
  const truths = useMemo(() => (terms.type === 'challenges' ? [] : TRUTHS.filter((p) => allowed(p, terms))), [terms]);
  const dares = useMemo(() => (terms.type === 'questions' ? [] : DARES.filter((p) => allowed(p, terms))), [terms]);

  if (view.session.status === 'completed' || tod.turn >= rounds) return <TodRecap view={view} s={s} terms={terms} rounds={rounds} />;
  if (!truths.length && !dares.length) return <Note tone="pink">No truths or dares match your shared boundaries. Open Boundaries to widen them, or try another mode.</Note>;
  return <TodTurn key={tod.turn} view={view} s={s} terms={terms} tod={tod} rounds={rounds} truths={truths} dares={dares} />;
}

function TodTurn({ view, s, tod, rounds, truths, dares }: ModeProps & { tod: Tod; rounds: number; truths: Prompt[]; dares: Prompt[] }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const turn = tod.turn;
  const active = activeFor(turn);
  const both = isBothRound(turn, truths.length > 0);
  const sid = view.session.id;

  const draw = (kind: Kind, alt: number) => drawFrom(kind === 'truth' ? truths : dares, `${sid}:tod:${turn}:${kind}:${alt}`, tod.used);
  const choose = (kind: Kind, alt = 0) =>
    run(`c-${kind}`, () =>
      s.patch((st) => {
        const t = (st.tod as Tod | undefined) ?? { turn: 0, current: null, used: [] };
        if (t.turn !== turn) return null;
        const p = draw(kind, alt);
        return p ? { tod: { ...t, current: { kind, id: p.id, alt } } } : null;
      }),
    );
  const nextTurn = (usedId?: string) =>
    run('next', () =>
      s.patch((st) => {
        const t = (st.tod as Tod | undefined) ?? { turn: 0, current: null, used: [] };
        if (t.turn !== turn) return null;
        return { tod: { turn: turn + 1, current: null, used: usedId ? [...t.used, usedId] : t.used } };
      }),
    );

  // Both-answer truth round
  const bothPrompt = useMemo(() => (both ? drawFrom(truths, `${sid}:tod:${turn}:both`, tod.used) : null), [both, truths, sid, turn, tod.used]);
  if (both && bothPrompt) return <BothRound view={view} s={s} prompt={bothPrompt} turn={turn} rounds={rounds} onNext={() => nextTurn(bothPrompt.id)} busy={busy} />;

  const current = tod.current ? ALL[tod.current.id] : null;
  const resp = entriesFor<Resp>(view, `pub:tod${turn}`)[active];
  const reaction = entriesFor<{ r: string; text?: string }>(view, `pub:re${turn}`)[active === 1 ? 2 : 1];
  const iAmActive = me === active;

  return (
    <div className="space-y-6">
      <StepProgress index={turn} total={rounds} label="Truth or Dare" />
      <div className="flex items-center gap-2.5 text-sm">
        <Avatar name={names[active]} seat={active} size="sm" />
        <span className="text-ink-soft">{iAmActive ? <span className="font-medium text-ink">Your turn</span> : <><span className="font-medium text-ink">{names[active]}</span>'s turn</>}</span>
      </div>

      {!tod.current &&
        (iAmActive ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {(['truth', 'dare'] as Kind[]).map((k) => {
              const disabled = (k === 'truth' ? truths : dares).length === 0;
              return (
                <button
                  key={k}
                  type="button"
                  disabled={disabled || busy !== null}
                  onClick={() => choose(k)}
                  className="group flex min-h-40 flex-col justify-between rounded-[12px] bg-white p-6 text-left shadow-lift transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-float disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  <span className="text-sm text-ink-mute">{k === 'truth' ? 'Answer honestly' : 'Do something'}</span>
                  <span className="text-[2rem] font-semibold tracking-[-0.03em] text-ink group-hover:text-accent">{k === 'truth' ? 'Truth' : 'Dare'}</span>
                  {disabled && <span className="text-xs text-ink-mute">Not in your shared boundaries</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <Waiting>{names[active]} is choosing truth or dare.</Waiting>
        ))}

      {current && tod.current && (
        <>
          <PromptCard
            animateKey={current.id}
            kicker={`${tod.current.kind === 'truth' ? 'Truth' : 'Dare'} for ${iAmActive ? 'you' : names[active]}, ${categoryTitle(current.category)}`}
            aside={<FavouriteButton view={view} s={s} id={current.id} text={current.text} />}
          >
            {current.text}
          </PromptCard>

          {!resp && iAmActive && <ActiveResponse kind={tod.current.kind} onSubmit={(r) => run('resp', () => s.submit(`pub:tod${turn}`, { kind: tod.current!.kind, id: current.id, ...r }))} onAlt={tod.current.alt < 2 ? () => choose(tod.current!.kind, tod.current!.alt + 1) : undefined} busy={busy} />}
          {!resp && !iAmActive && <Waiting>{tod.current.kind === 'truth' ? `${names[active]} is answering.` : `${names[active]} is taking on the dare.`}</Waiting>}

          {resp && (
            <div className="space-y-4">
              <div className="rounded-[10px] bg-white p-4 shadow-hairline">
                <p className="text-sm font-medium text-ink-soft">
                  {resp.payload.status === 'skipped' ? `${iAmActive ? 'You' : names[active]} skipped this one. No problem.` : resp.payload.status === 'done' ? `${iAmActive ? 'You' : names[active]} did the dare.` : `${iAmActive ? 'Your' : `${names[active]}'s`} answer`}
                </p>
                {resp.payload.text && <p className="mt-1 whitespace-pre-line">{resp.payload.text}</p>}
              </div>
              {resp.payload.status !== 'skipped' && (reaction ? (
                <p className="text-sm text-ink-soft">
                  <span className="font-medium text-ink">{names[active === 1 ? 2 : 1]} reacted:</span> {reaction.payload.r}
                  {reaction.payload.text ? `, “${reaction.payload.text}”` : ''}
                </p>
              ) : !iAmActive ? (
                <Reactions onReact={(r, text) => run('react', () => s.submit(`pub:re${turn}`, { r, ...(text ? { text } : {}) }))} busy={busy} />
              ) : null)}
              <Button size="lg" block loading={busy === 'next'} onClick={() => nextTurn(current.id)}>
                {turn + 1 >= rounds ? 'See the recap' : `Next turn: ${names[activeFor(turn + 1)]}`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ActiveResponse({ kind, onSubmit, onAlt, busy }: { kind: Kind; onSubmit: (r: Omit<Resp, 'kind' | 'id'>) => void; onAlt?: () => void; busy: string | null }) {
  const [text, setText] = useDraft('tod-resp', '');
  return (
    <div className="space-y-3">
      <TextAnswer label={kind === 'truth' ? 'Your answer' : 'Add a note'} value={text} onChange={setText} max={500} rows={3} placeholder={kind === 'truth' ? 'Answer here, or out loud and tap Answered' : 'Add a note about how it went (optional)'} />
      <div className="flex flex-wrap gap-2">
        <Button icon={<Check className="size-4" />} loading={busy === 'resp'} onClick={() => onSubmit({ status: kind === 'truth' ? 'answered' : 'done', ...(text.trim() ? { text: text.trim() } : {}) })}>
          {kind === 'truth' ? 'Answered' : 'Dare done'}
        </Button>
        {onAlt && (
          <Button variant="secondary" icon={<RefreshCw className="size-4" />} loading={busy === `c-${kind}`} onClick={onAlt}>
            Different {kind}
          </Button>
        )}
        <Button variant="ghost" icon={<SkipForward className="size-4" />} onClick={() => onSubmit({ status: 'skipped' })}>
          Skip
        </Button>
      </div>
    </div>
  );
}

function Reactions({ onReact, busy }: { onReact: (r: string, text?: string) => void; busy: string | null }) {
  const [text, setText] = useDraft('tod-react', '');
  return (
    <div className="space-y-2 rounded-[10px] bg-mist p-4 shadow-hairline">
      <p className="text-sm font-medium">React (optional)</p>
      <div className="flex flex-wrap gap-2">
        {REACTIONS.map((r) => (
          <button key={r} type="button" disabled={busy !== null} onClick={() => onReact(r, text.trim() || undefined)} className="rounded-[6px] bg-white px-3 py-1.5 text-sm shadow-[0_0_0_1px_var(--color-line-strong)] hover:bg-shell hover:text-accent-deep">
            {r}
          </button>
        ))}
      </div>
      <input value={text} onChange={(e) => setText(e.target.value)} maxLength={140} placeholder="Add a follow-up line (optional)" className="h-9 w-full rounded-[6px] bg-white px-3 text-sm shadow-[0_0_0_1px_var(--color-line-strong)] outline-none focus:shadow-[0_0_0_1px_var(--color-accent)]" />
    </div>
  );
}

function BothRound({ view, s, prompt, turn, rounds, onNext, busy }: Omit<ModeProps, 'terms'> & { prompt: Prompt; turn: number; rounds: number; onNext: () => void; busy: string | null }) {
  const { run, busy: b2 } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const key = `seal:tb${turn}`;
  const pair = entriesFor<{ text?: string; skipped?: boolean }>(view, key);
  const revealed = Boolean(pair[1] && pair[2]);
  const just = useJustRevealed(key, revealed);
  const [text, setText] = useDraft(key, '');
  return (
    <div className="space-y-6">
      <StepProgress index={turn} total={rounds} label="Truth or Dare" />
      <PromptCard animateKey={prompt.id} tone="blush" kicker="Both of you answer this one" aside={<FavouriteButton view={view} s={s} id={prompt.id} text={prompt.text} />}>
        {prompt.text}
      </PromptCard>
      {!pair[me] && (
        <div className="space-y-3">
          <TextAnswer label="Your answer" value={text} onChange={setText} max={500} rows={3} placeholder="Hidden until you have both answered" />
          <div className="flex gap-2">
            <Button className="flex-1" size="lg" disabled={!text.trim()} loading={b2 === 'a'} onClick={() => run('a', () => s.submit(key, { text: text.trim() }))}>
              Lock in
            </Button>
            <Button size="lg" variant="ghost" onClick={() => run('sk', () => s.submit(key, { skipped: true }))}>
              Skip
            </Button>
          </div>
          {partnerHasPending(view, key) && <p className="text-center text-sm text-ink-mute">{names[me === 1 ? 2 : 1]} has answered.</p>}
        </div>
      )}
      {pair[me] && !revealed && <Waiting>Locked in. Waiting for {names[me === 1 ? 2 : 1]}.</Waiting>}
      {revealed && (
        <>
          <AnswerPair names={names} me={me} animate={just} render={(seat) => (pair[seat]!.payload.skipped ? <span className="text-ink-mute italic">Skipped</span> : <span className="whitespace-pre-line">{pair[seat]!.payload.text}</span>)} />
          <Button size="lg" block loading={busy === 'next'} onClick={onNext}>
            {turn + 1 >= rounds ? 'See the recap' : 'Next turn'}
          </Button>
        </>
      )}
    </div>
  );
}

function TodRecap({ view, s, rounds }: ModeProps & { rounds: number }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const responses = entriesWithPrefix<Resp>(view, 'pub:tod');
  const answered = responses.filter((r) => r.payload.status !== 'skipped');
  const dares = responses.filter((r) => r.payload.status === 'done').length;
  const skipped = responses.filter((r) => r.payload.status === 'skipped').length;
  const favs = entriesWithPrefix(view, 'pub:fav:').length;
  if (view.session.status !== 'completed') {
    return (
      <div className="space-y-4">
        <p className="text-[1.4rem] font-semibold">That was the last turn.</p>
        <Button size="lg" block loading={busy === 'c'} onClick={() => run('c', () => s.complete())}>
          See the recap
        </Button>
      </div>
    );
  }
  return (
    <Recap
      view={view}
      mode="truth_dare"
      title="Truth or Dare"
      stats={[
        ['Turns played', Math.min(rounds, responses.length + entriesWithPrefix(view, 'seal:tb').length / 2)],
        ['Truths answered', answered.length - dares],
        ['Dares done', dares],
        ['Favourites', favs],
      ]}
      momentTitle="A night of Truth or Dare"
    >
      <RecapList
        title="Answers worth remembering"
        items={answered
          .filter((r) => r.payload.text)
          .map((r) => (
            <>
              <p className="text-sm text-ink-mute">{ALL[r.payload.id]?.text}</p>
              <p className="mt-0.5">
                <span className="font-medium">{names[r.player_number]}: </span>
                {r.payload.text}
              </p>
            </>
          ))}
      />
      {skipped > 0 && <p className="text-sm text-ink-mute">{skipped} skipped. Skipping is always part of the game.</p>}
    </Recap>
  );
}
