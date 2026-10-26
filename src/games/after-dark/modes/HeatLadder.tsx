import { useMemo } from 'react';
import { ArrowDownToLine, Check, SkipForward } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { AnswerPair, Note, TextAnswer, Waiting } from '../../../components/session/Parts';
import { entriesFor, seatNames } from '../../../hooks/useSession';
import type { PlayerNumber, SessionView } from '../../../lib/types';
import { useBusy, useDraft, useJustRevealed } from '../../flow';
import type { ModeProps } from '../AfterDark';
import { DARES } from '../content/dares';
import { TRUTHS } from '../content/truths';
import { allowed, contentCap, type Category, type Prompt, type Setup, type Terms } from '../content/taxonomy';
import { Recap } from '../Recap';
import { drawFrom, PromptCard } from '../shared';

const ROUNDS: { n: number; title: string; theme: string; cats: Category[]; tint: string; bar: string }[] = [
  { n: 1, title: 'Spark', theme: 'Flirting and attraction', cats: ['flirty', 'compliments'], tint: '#FFF6F8', bar: '#F2B8C9' },
  { n: 2, title: 'Warmth', theme: 'Romantic preferences', cats: ['romantic', 'kissing', 'dates'], tint: '#FFF0F4', bar: '#E58BA8' },
  { n: 3, title: 'Heat', theme: 'Bold questions', cats: ['bold', 'flirty'], tint: '#FBE2E9', bar: '#D4668C' },
  { n: 4, title: 'Close', theme: 'Desires and boundaries', cats: ['desires'], tint: '#F7D3DE', bar: '#C94F78' },
  { n: 5, title: 'Together', theme: 'A challenge you both choose', cats: [], tint: '#F2C4D3', bar: '#9F345B' },
];
const PER_ROUND = 3;

/** Prompts for a round: never above the agreed level, never outside agreed categories. */
function roundPrompts(r: number, terms: Terms, sid: string): Prompt[] {
  const level = Math.min(r, contentCap(terms.level ?? 1));
  const round = ROUNDS[r - 1]!;
  const eligible = TRUTHS.filter((p) => allowed(p, terms) && p.level <= level);
  const themed = eligible.filter((p) => round.cats.includes(p.category));
  const pool = themed.length >= PER_ROUND ? themed : eligible;
  const out: Prompt[] = [];
  for (let j = 0; j < PER_ROUND && out.length < pool.length; j++) {
    const p = drawFrom(pool, `${sid}:ladder:${r}:${j}`, out.map((x) => x.id));
    if (p && !out.includes(p)) out.push(p);
  }
  return out;
}

function challengeOptions(terms: Terms, sid: string): Prompt[] {
  const pool = DARES.filter((p) => allowed(p, terms));
  const out: Prompt[] = [];
  for (let j = 0; j < 3 && out.length < pool.length; j++) {
    const p = drawFrom(pool, `${sid}:ladder:5:${j}`, out.map((x) => x.id));
    if (p) out.push(p);
  }
  return out;
}

const roundDone = (view: SessionView, r: number, n: number) => {
  for (let j = 0; j < n; j++) {
    const pair = entriesFor(view, `seal:h${r}j${j}`);
    if (!pair[1] || !pair[2]) return false;
  }
  return true;
};

export default function HeatLadder({ view, s, terms }: ModeProps) {
  const round = Number(view.session.state.round ?? 1);
  if (view.session.status === 'completed' || round > 5) return <LadderRecap view={view} s={s} terms={terms} />;
  const meta = ROUNDS[round - 1]!;
  return (
    <div className="space-y-6">
      <ol className="grid grid-cols-5 gap-1.5" aria-label="Rounds">
        {ROUNDS.map((r) => (
          <li key={r.n} className="text-center">
            <span className="block h-1.5 rounded-[2px]" style={{ background: r.n <= round ? r.bar : 'var(--color-line)' }} aria-hidden="true" />
            <span className={`mt-1.5 block text-xs ${r.n === round ? 'font-medium text-ink' : 'text-ink-mute'}`}>{r.title}</span>
          </li>
        ))}
      </ol>
      <header className="rounded-[12px] px-5 py-4" style={{ background: meta.tint }}>
        <p className="text-sm text-ink-soft">Round {round} of 5</p>
        <h1 className="text-[1.45rem] font-semibold tracking-[-0.02em]">
          {meta.title}: {meta.theme}
        </h1>
      </header>
      {round < 5 ? <QuestionRound key={round} view={view} s={s} terms={terms} r={round} /> : <ChallengeRound view={view} s={s} terms={terms} />}
    </div>
  );
}

function QuestionRound({ view, s, terms, r }: ModeProps & { r: number }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner: PlayerNumber = me === 1 ? 2 : 1;
  const prompts = useMemo(() => roundPrompts(r, terms, view.session.id), [r, terms, view.session.id]);
  const firstOpen = prompts.findIndex((_, j) => {
    const pair = entriesFor(view, `seal:h${r}j${j}`);
    return !pair[1] || !pair[2];
  });
  const done = prompts.length === 0 || roundDone(view, r, prompts.length);
  const cont = entriesFor<{ go: boolean }>(view, `pub:hc${r}`);
  const mySetup = entriesFor<Setup>(view, 'priv:setup')[me]?.payload;

  if (!done) {
    const j = firstOpen;
    return <LadderPrompt key={j} view={view} s={s} terms={terms} r={r} j={j} p={prompts[j]!} count={prompts.length} />;
  }
  return (
    <div className="space-y-4">
      {prompts.length === 0 && <Note>Nothing in this round fits your shared boundaries, so it is skipped.</Note>}
      <Note tone="pink">Round complete. You only move up if you both want to.</Note>
      {cont[me] ? (
        <Waiting>{cont[partner] ? 'Moving up.' : `You're ready for the next round. Waiting for ${names[partner]}.`}</Waiting>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            size="lg"
            className="sm:flex-1"
            loading={busy === 'up'}
            onClick={() =>
              run('up', async () => {
                await s.submit(`pub:hc${r}`, { go: true });
                // If the partner already confirmed, climb straight away.
                if (cont[partner]?.payload.go) await s.patch((st) => (Number(st.round ?? 1) === r ? { round: r + 1 } : null));
              })
            }
          >
            {r === 4 ? 'Continue to the final round' : 'Continue to the next round'}
          </Button>
          {mySetup && mySetup.level > 1 && (
            <Button
              size="lg"
              variant="secondary"
              icon={<ArrowDownToLine className="size-4" />}
              loading={busy === 'low'}
              onClick={() => run('low', () => s.submit('priv:setup', { ...mySetup, level: Math.max(1, mySetup.level - 1) }))}
            >
              Lower my intensity
            </Button>
          )}
        </div>
      )}
      {cont[me] && cont[partner] && Number(view.session.state.round ?? 1) === r && (
        <Button size="lg" block loading={busy === 'adv'} onClick={() => run('adv', () => s.patch((st) => (Number(st.round ?? 1) === r ? { round: r + 1 } : null)))}>
          Go to round {r + 1}
        </Button>
      )}
    </div>
  );
}

function LadderPrompt({ view, s, r, j, p, count }: ModeProps & { r: number; j: number; p: Prompt; count: number }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const key = `seal:h${r}j${j}`;
  const pair = entriesFor<{ text?: string; skipped?: boolean }>(view, key);
  const revealed = Boolean(pair[1] && pair[2]);
  const just = useJustRevealed(key, revealed);
  const [text, setText] = useDraft(key, '');
  return (
    <div className="space-y-4">
      <p className="tabular text-sm text-ink-mute">
        Question {j + 1} of {count}
      </p>
      <PromptCard animateKey={p.id} kicker="You both answer">
        {p.text}
      </PromptCard>
      {!pair[me] ? (
        <>
          <TextAnswer label="Your answer" value={text} onChange={setText} max={500} rows={3} placeholder="Hidden until you have both answered" />
          <div className="flex gap-2">
            <Button size="lg" className="flex-1" disabled={!text.trim()} loading={busy === 'a'} onClick={() => run('a', () => s.submit(key, { text: text.trim() }))}>
              Lock in
            </Button>
            <Button size="lg" variant="ghost" icon={<SkipForward className="size-4" />} onClick={() => run('sk', () => s.submit(key, { skipped: true }))}>
              Skip
            </Button>
          </div>
        </>
      ) : !revealed ? (
        <Waiting>Locked in. Waiting for {names[me === 1 ? 2 : 1]}.</Waiting>
      ) : (
        <AnswerPair names={names} me={me} animate={just} render={(seat) => (pair[seat]!.payload.skipped ? <span className="text-ink-mute italic">Skipped</span> : <span className="whitespace-pre-line">{pair[seat]!.payload.text}</span>)} />
      )}
    </div>
  );
}

function ChallengeRound({ view, s, terms }: ModeProps) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner: PlayerNumber = me === 1 ? 2 : 1;
  const options = useMemo(() => (terms.type === 'questions' ? [] : challengeOptions(terms, view.session.id)), [terms, view.session.id]);
  const picks = entriesFor<{ id: string }>(view, 'seal:h5pick');
  const agrees = entriesFor<{ id: string }>(view, 'pub:h5agree');
  const result = entriesFor<{ status: 'done' | 'skipped' }>(view, 'pub:h5done');
  const [sel, setSel] = useDraft<string | null>('h5', null);

  const chosenBy = (seat: PlayerNumber) => agrees[seat]?.payload.id ?? picks[seat]?.payload.id;
  const agreed = picks[1] && picks[2] && chosenBy(1) === chosenBy(2) ? chosenBy(1) : null;
  const agreedPrompt = options.find((o) => o.id === agreed);
  const outcome = result[1] ?? result[2];

  if (!options.length)
    return (
      <div className="space-y-4">
        <Note>Your shared boundaries don't include challenges, so the ladder ends here.</Note>
        <Button size="lg" block loading={busy === 'end'} onClick={() => run('end', () => s.complete())}>
          See the recap
        </Button>
      </div>
    );

  return (
    <div className="space-y-4">
      {!picks[me] && (
        <>
          <p className="text-ink-soft">Each of you picks the challenge you'd most like. If you pick the same one, that's your challenge. The result is a suggestion, never an obligation.</p>
          <div className="space-y-2" role="radiogroup" aria-label="Challenge">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={sel === o.id}
                onClick={() => setSel(o.id)}
                className={`w-full rounded-[10px] px-4 py-3.5 text-left ${sel === o.id ? 'bg-shell shadow-[0_0_0_1.5px_var(--color-accent)]' : 'bg-white shadow-[0_0_0_1px_var(--color-line-strong)] hover:bg-mist'}`}
              >
                {o.text}
              </button>
            ))}
          </div>
          <Button size="lg" block disabled={!sel} loading={busy === 'p'} onClick={() => run('p', () => s.submit('seal:h5pick', { id: sel }))}>
            Lock in my pick
          </Button>
        </>
      )}
      {picks[me] && !picks[partner] && <Waiting>Locked in. Waiting for {names[partner]} to choose.</Waiting>}
      {picks[1] && picks[2] && !agreed && (
        <div className="space-y-3">
          <Note tone="pink">You chose different challenges. Either of you can go with the other's pick, or leave it there.</Note>
          {([1, 2] as PlayerNumber[]).map((seat) => {
            const p = options.find((o) => o.id === chosenBy(seat));
            return (
              <div key={seat} className="flex items-center gap-3 rounded-[10px] bg-white p-4 shadow-hairline">
                <p className="flex-1">
                  <span className="text-sm text-ink-mute">{seat === me ? 'Your pick' : `${names[seat]}'s pick`}</span>
                  <span className="block">{p?.text}</span>
                </p>
                {seat !== me && (
                  <Button size="sm" variant="secondary" loading={busy === 'ag'} onClick={() => run('ag', () => s.submit('pub:h5agree', { id: chosenBy(seat) }))}>
                    Go with this
                  </Button>
                )}
              </div>
            );
          })}
          <Button variant="ghost" loading={busy === 'end'} onClick={() => run('end', () => s.complete())}>
            End without a challenge
          </Button>
        </div>
      )}
      {agreedPrompt && (
        <>
          <PromptCard animateKey={agreedPrompt.id} tone="blush" kicker="Your challenge, chosen together">
            {agreedPrompt.text}
          </PromptCard>
          {!outcome ? (
            <div className="flex gap-2">
              <Button size="lg" className="flex-1" icon={<Check className="size-4" />} loading={busy === 'd'} onClick={() => run('d', () => s.submit('pub:h5done', { status: 'done' }))}>
                We did it
              </Button>
              <Button size="lg" variant="ghost" onClick={() => run('s', () => s.submit('pub:h5done', { status: 'skipped' }))}>
                Skip
              </Button>
            </div>
          ) : (
            <Button size="lg" block loading={busy === 'end'} onClick={() => run('end', () => s.complete())}>
              Finish the ladder
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function LadderRecap({ view, s }: ModeProps) {
  const { busy, run } = useBusy();
  if (view.session.status !== 'completed') {
    return (
      <Button size="lg" block loading={busy === 'c'} onClick={() => run('c', () => s.complete())}>
        See the recap
      </Button>
    );
  }
  const sealed = view.entries.filter((e) => /^seal:h[1-4]j/.test(e.key));
  const answered = sealed.filter((e) => !(e.payload as { skipped?: boolean }).skipped).length;
  const reached = Math.min(5, Number(view.session.state.round ?? 1));
  const challenge = (entriesFor<{ status: string }>(view, 'pub:h5done')[1] ?? entriesFor<{ status: string }>(view, 'pub:h5done')[2])?.payload.status;
  return (
    <Recap
      view={view}
      mode="ladder"
      title="The Heat Ladder"
      stats={[
        ['Highest round', `${reached} of 5`],
        ['Answers given', answered],
        ['Skipped', sealed.length - answered],
        ['Final challenge', challenge === 'done' ? 'Done' : challenge === 'skipped' ? 'Skipped' : 'Not reached'],
      ]}
      momentTitle={`The Heat Ladder: round ${reached}`}
    />
  );
}
