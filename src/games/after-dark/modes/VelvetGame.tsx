import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bookmark, Check, EyeOff, LockKeyhole, Search, SkipForward } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Avatar, seatTone } from '../../../components/ui/Avatar';
import { Note, StepProgress, Waiting } from '../../../components/session/Parts';
import { entriesFor, entriesWithPrefix, partnerHasPending, seatNames } from '../../../hooks/useSession';
import type { PlayerNumber, SessionView } from '../../../lib/types';
import { useBusy, useDraft, useJustRevealed } from '../../flow';
import type { SessionApi } from '../../types';
import type { ModeProps } from '../AfterDark';
import { VELVET } from '../content/velvet';
import { ATLAS_GROUPS } from '../content/velvet/atlas';
import { FOLLOW_UPS, SHARE_OPTIONS, VAULT_STAGES, VELVET_CATS, type VCat, type VItem } from '../content/velvet/types';
import {
  TOPIC_CATS,
  drawVault,
  drawVelvet,
  needsShare,
  nextVaultStage,
  searchAtlas,
  toggleVelvet,
  validVelvet,
  vaultStageAvailable,
  velvetById,
  velvetPool,
  velvetVerdict,
  velvetVerdictText,
  type Verdict,
} from '../content/velvet/logic';
import { Recap, RecapList } from '../Recap';

/**
 * VELVET: Body & Desire. Tap-only. Every answer key ends in a round key `k`:
 *   seal:x<k>   answer, hidden until both have one (server-enforced), immutable
 *   pub:xs<k>   permission items: an answer its author chose to show now
 *   priv:x<k>   permission items: kept private; only its author can ever read it
 *   pub:xd<k>   permission items: "answered" marker {share}, never the answer
 *   pub:fu<k>   follow-up pick {o}
 *   pub:later<k>, pub:vs<n>e<epoch>  bookmarks and Vault opt-ins
 * k is the step index for played rounds, or "a-<card>" for Atlas cards.
 */
type Style = 'categories' | 'roulette' | 'vault' | 'atlas';
type Share = 'together' | 'now' | 'private';
type Answer = { id: string; picks: string[] };

const other = (p: PlayerNumber): PlayerNumber => (p === 1 ? 2 : 1);
const answererFor = (i: number): PlayerNumber => (i % 2 === 0 ? 1 : 2);
const catTitle = (c: VCat) => VELVET_CATS.find((x) => x.id === c)?.title ?? c;
const atlasKey = (q: VItem) => `a-${q.id.slice(2)}`;
const optText = (q: VItem, ids: string[]) => ids.map((id) => q.options.find((o) => o.id === id)?.text ?? id).join(' + ');

interface GameState {
  step: number;
  qs: string[];
  skipped: number[];
  stage: number;
  stageStart: number;
  epoch: number;
  spins: Record<string, VCat>;
}

function readState(raw: Record<string, unknown>): GameState {
  return {
    step: Number(raw.step ?? 0),
    qs: Array.isArray(raw.qs) ? (raw.qs as string[]) : [],
    skipped: Array.isArray(raw.skipped) ? (raw.skipped as number[]) : [],
    stage: Number(raw.stage ?? 0),
    stageStart: Number(raw.stageStart ?? 0),
    epoch: Number(raw.epoch ?? 0),
    spins: raw.spins && typeof raw.spins === 'object' ? (raw.spins as Record<string, VCat>) : {},
  };
}

function readSettings(view: SessionView) {
  const raw = view.session.settings;
  const style: Style = (['categories', 'roulette', 'vault', 'atlas'] as const).includes(raw.style as Style) ? (raw.style as Style) : 'categories';
  const only = TOPIC_CATS.includes(raw.only as VCat) ? (raw.only as VCat) : null;
  return {
    style,
    only,
    rounds: Math.min(40, Math.max(4, Number(raw.rounds ?? 15) || 15)),
    perStage: Math.min(12, Math.max(3, Number(raw.perStage ?? 6) || 6)),
  };
}

const skip = (s: SessionApi, step: number) =>
  s.patch((raw) => {
    const now = readState(raw);
    return now.step === step ? { step: step + 1, skipped: [...now.skipped, step] } : null;
  });
const advance = (s: SessionApi, step: number) => s.patch((raw) => (readState(raw).step === step ? { step: step + 1 } : null));

function roundDone(view: SessionView, q: VItem, k: string) {
  if (needsShare(q)) {
    const m = entriesFor(view, `pub:xd${k}`);
    return Boolean(m[1] && m[2]);
  }
  const p = entriesFor(view, `seal:x${k}`);
  return Boolean(p[1] && p[2]);
}

/** A seat's answer as I am allowed to see it, honouring every disclosure choice. */
function visibleAnswer(view: SessionView, k: string, seat: PlayerNumber): { a?: Answer; share?: Share } {
  const me = view.me.player_number;
  const share = entriesFor<{ share: Share }>(view, `pub:xd${k}`)[seat]?.payload.share;
  if (seat === me) {
    const a = entriesFor<Answer>(view, `priv:x${k}`)[me] ?? entriesFor<Answer>(view, `seal:x${k}`)[me];
    return { a: a?.payload, share };
  }
  const open = entriesFor<Answer>(view, `pub:xs${k}`)[seat];
  const sealed = entriesFor<Answer>(view, `seal:x${k}`)[seat];
  return { a: (open ?? sealed)?.payload, share };
}

/** The verdict both players can see, or null when an answer is not visible to both. */
function pairFor(view: SessionView, q: VItem, k: string): { v: Verdict; a: string[]; b: string[] } | null {
  const me = view.me.player_number;
  const mine = visibleAnswer(view, k, me);
  const theirs = visibleAnswer(view, k, other(me));
  const mineShared = !needsShare(q) || mine.share !== 'private' || Boolean(entriesFor(view, `pub:xs${k}`)[me]);
  if (!mine.a || !theirs.a || !mineShared) return null;
  const a = me === 1 ? mine.a.picks : theirs.a.picks;
  const b = me === 1 ? theirs.a.picks : mine.a.picks;
  return { v: velvetVerdict(q, a, b), a, b };
}

/* ---------------------------------------------------------------------------- */

export default function VelvetGame(props: ModeProps) {
  const { style } = readSettings(props.view);
  if (props.view.session.status === 'completed') return <Results {...props} />;
  if (style === 'atlas') return <AtlasBrowser {...props} />;
  return <StepFlow {...props} />;
}

function StepFlow({ view, s, terms }: ModeProps) {
  const { style, only, rounds, perStage } = readSettings(view);
  const st = readState(view.session.state);
  const agreed = terms.categories as string[] | undefined;
  const vault = style === 'vault';
  const roulette = style === 'roulette';
  const stageCats = vault ? (VAULT_STAGES.find((x) => x.n === st.stage)?.cats ?? []) : only ? [only] : TOPIC_CATS;
  const pool = useMemo(() => velvetPool(agreed, stageCats), [agreed?.join(','), stageCats.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = st.qs[st.step] ? velvetById(st.qs[st.step]!) : undefined;
  const k = String(st.step);
  const done = current ? roundDone(view, current, k) : false;
  const allowedCat = (c: VCat) => c === 'vault' || ((agreed ?? []).includes(c) && stageCats.includes(c));
  const outOfBounds = Boolean(current && !done && !allowedCat(current.cat));
  const seed = `${view.session.id}:${st.step}`;
  const nextDraw = vault ? drawVault(agreed, st.stage, st.qs, seed) : drawVelvet(pool, st.qs, seed);
  const exhausted = !current && !nextDraw;
  const atGate = vault && !current && (st.stage === 0 || st.step - st.stageStart >= perStage || exhausted);
  const finished = !vault && (st.step >= rounds || exhausted);

  useEffect(() => {
    if (roulette || current || atGate || finished || exhausted) return;
    void s.patch((raw) => {
      const now = readState(raw);
      if (now.step !== st.step || now.qs[now.step]) return null;
      const sd = `${view.session.id}:${now.step}`;
      const q = vault ? drawVault(agreed, now.stage, now.qs, sd) : drawVelvet(pool, now.qs, sd);
      return q ? { qs: [...now.qs.slice(0, now.step), q.id] } : null;
    });
  }, [roulette, vault, current, atGate, finished, exhausted, pool, agreed, s, st.step, view.session.id]);

  useEffect(() => {
    if (outOfBounds) void skip(s, st.step);
  }, [outOfBounds, s, st.step]);

  if (finished) return <FinishButton s={s} note={exhausted ? 'That is every question your shared categories allow for now. Widen them in Boundaries, or see your results.' : undefined} />;
  if (atGate) return <VaultGate view={view} s={s} agreed={agreed} st={st} />;

  const total = vault ? perStage : rounds;
  const index = vault ? st.step - st.stageStart : st.step;
  const label = vault ? `The Velvet Vault, stage ${st.stage}: ${VAULT_STAGES[st.stage - 1]?.title}` : roulette ? 'Desire Roulette' : only ? catTitle(only) : 'VELVET';
  const last = index + 1 >= total;
  const nextLabel = last ? (vault ? 'Finish this stage' : 'See your results') : roulette ? 'Spin again' : 'Next';
  const onNext = async () => {
    await advance(s, st.step);
    if (last && !vault) await s.complete();
  };

  const round = current && !outOfBounds && (
    <Round key={`${k}:${current.id}`} view={view} s={s} q={current} k={k} answerer={answererFor(st.step)} index={index} total={total} label={label} onSkip={() => skip(s, st.step)} onNext={onNext} nextLabel={nextLabel} />
  );

  if (roulette) {
    return (
      <Roulette view={view} s={s} agreed={agreed} st={st} progress={<StepProgress index={index} total={total} label={label} />}>
        {round || <Waiting>Choosing the next question</Waiting>}
      </Roulette>
    );
  }

  return (
    <div className="space-y-6">
      {vault && <VaultBar s={s} st={st} />}
      {round || <Waiting>Choosing the next question</Waiting>}
    </div>
  );
}

function FinishButton({ s, note }: { s: SessionApi; note?: string }) {
  const { busy, run } = useBusy();
  return (
    <div className="space-y-4">
      {note && <Note tone="pink">{note}</Note>}
      <Button size="lg" block loading={busy === 'c'} onClick={() => run('c', () => s.complete())}>
        See your results
      </Button>
    </div>
  );
}

/* --------------------------------- roulette -------------------------------- */

const WHEEL_TONES = ['#fff0f4', '#fbe2e9', '#f6cfdc', '#fff7f9'];

function Roulette({ view, s, agreed, st, progress, children }: { view: SessionView; s: SessionApi; agreed: string[] | undefined; st: GameState; progress: React.ReactNode; children: React.ReactNode }) {
  const { busy, run } = useBusy();
  const cats = TOPIC_CATS.filter((c) => velvetPool(agreed, [c]).some((q) => !st.qs.includes(q.id)));
  const k = String(st.step);
  const landed = st.spins[k];
  const [spinning, setSpinning] = useState(false);
  const [settling, setSettling] = useState(false);
  const seg = 360 / Math.max(1, cats.length);
  const idx = landed ? Math.max(0, cats.indexOf(landed)) : 0;
  const target = landed ? 360 * 6 - (idx + 0.5) * seg : 0;
  const [rot, setRot] = useState(target);
  const prev = useRef(landed);
  const arriving = Boolean(landed && !prev.current);

  // Animate only when the spin happens while we are watching; a reload shows the result directly.
  useEffect(() => {
    if (landed && !prev.current) {
      prev.current = landed;
      setSpinning(true);
      setRot(0);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setRot(target)));
      const t1 = window.setTimeout(() => {
        setSettling(true);
        setSpinning(false);
      }, 2750);
      const t2 = window.setTimeout(() => setSettling(false), 3900);
      return () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }
    prev.current = landed;
    if (!landed) setRot(0);
    return undefined;
  }, [landed, target]);

  if (landed && !spinning && !settling && !arriving) return <>{children}</>;
  if (!cats.length && !landed) return <FinishButton s={s} note="The wheel has run out of questions in the categories you both chose." />;

  async function spin() {
    await s.patch((raw) => {
      const now = readState(raw);
      if (now.step !== st.step || now.spins[String(now.step)]) return null;
      const avail = TOPIC_CATS.filter((c) => velvetPool(agreed, [c]).some((q) => !now.qs.includes(q.id)));
      if (!avail.length) return null;
      const cat = avail[Math.floor(Math.random() * avail.length)]!;
      const q = drawVelvet(velvetPool(agreed, [cat]), now.qs, `${view.session.id}:${now.step}`);
      if (!q) return null;
      return { spins: { ...now.spins, [String(now.step)]: cat }, qs: [...now.qs.slice(0, now.step), q.id] };
    });
  }

  const size = 300;
  const r = size / 2;
  const wedge = (i: number) => {
    const a0 = ((i * seg - 90) * Math.PI) / 180;
    const a1 = (((i + 1) * seg - 90) * Math.PI) / 180;
    const large = seg > 180 ? 1 : 0;
    return `M${r},${r} L${r + r * Math.cos(a0)},${r + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${r + r * Math.cos(a1)},${r + r * Math.sin(a1)} Z`;
  };

  return (
    <div className="space-y-6">
    {progress}
    <div className="grid place-items-center gap-6 rounded-[14px] bg-white px-4 py-8 shadow-lift">
      <div className="text-center">
        <p className="text-sm font-medium text-accent">Desire Roulette</p>
        <p className="mt-1 text-ink-soft">{spinning || arriving ? 'Spinning...' : landed ? `It landed on ${catTitle(landed)}.` : 'Only categories you both chose are on the wheel.'}</p>
      </div>
      <div className="relative" style={{ width: size, height: size }}>
        <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 border-x-[10px] border-t-[16px] border-x-transparent border-t-accent-deep" aria-hidden="true" />
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          role="img"
          aria-label={landed ? `Wheel landed on ${catTitle(landed)}` : 'Wheel of categories'}
          style={{
            transform: `rotate(${rot}deg)`,
            transition: rot === 0 ? 'none' : 'transform 2.6s cubic-bezier(0.17, 0.67, 0.12, 1)',
          }}
          className="rounded-full shadow-[0_0_0_6px_#fff,0_0_0_7px_var(--color-line)]"
        >
          {cats.map((c, i) => {
            const mid = ((i + 0.5) * seg - 90) * (Math.PI / 180);
            const tx = r + r * 0.62 * Math.cos(mid);
            const ty = r + r * 0.62 * Math.sin(mid);
            return (
              <g key={c}>
                <path d={wedge(i)} fill={c === landed && !spinning && !arriving ? '#c94f78' : WHEEL_TONES[i % WHEEL_TONES.length]} stroke="#fff" strokeWidth="2" />
                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${(i + 0.5) * seg} ${tx} ${ty})`} fontSize="11" fontWeight="600" fill={c === landed && !spinning && !arriving ? '#fff' : '#9f345b'}>
                  {catTitle(c).split(' ')[0]}
                </text>
              </g>
            );
          })}
          <circle cx={r} cy={r} r={26} fill="#fff" stroke="#eee5e9" />
        </svg>
      </div>
      {!landed && (
        <Button size="lg" loading={busy === 'spin'} onClick={() => run('spin', spin)}>
          Spin the wheel
        </Button>
      )}
    </div>
    </div>
  );
}

/* ----------------------------------- vault ---------------------------------- */

function VaultBar({ s, st }: { s: SessionApi; st: GameState }) {
  const { busy, run } = useBusy();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-white px-4 py-3 shadow-hairline sm:px-5">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">The Velvet Vault</span>
        <div className="flex items-center gap-1" aria-label={`Stage ${st.stage} of 5`}>
          {VAULT_STAGES.map((l) => (
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
          Back to stage {st.stage - 1}
        </button>
      )}
    </div>
  );
}

function VaultGate({ view, s, agreed, st }: { view: SessionView; s: SessionApi; agreed: string[] | undefined; st: GameState }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner = other(me);
  const target = nextVaultStage(agreed, st.stage);
  const key = target ? `pub:vs${target}e${st.epoch}` : '';
  const votes = target ? entriesFor(view, key) : {};

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
        <p className="text-sm font-medium text-accent">The Velvet Vault</p>
        <h1 className="mt-1 text-[1.6rem] font-semibold tracking-[-0.02em]">{st.stage === 0 ? 'Ready to open the Vault?' : `Stage ${st.stage} unlocked`}</h1>
        <p className="mt-1.5 text-ink-soft">Five stages, each more personal. You each opt in to every stage. No pressure, no penalties, and you can stop here.</p>
      </div>
      <ol className="divide-y divide-line rounded-[12px] bg-white shadow-hairline">
        {VAULT_STAGES.map((l) => {
          const available = vaultStageAvailable(agreed, l.n);
          const isNext = l.n === target;
          return (
            <li key={l.n} className={`flex items-start gap-4 px-4 py-3.5 sm:px-5 ${isNext ? 'bg-shell' : ''}`}>
              <span className={`tabular grid size-7 shrink-0 place-items-center rounded-[6px] text-sm font-semibold ${l.n <= st.stage ? 'bg-accent text-white' : isNext ? 'bg-white text-accent-deep shadow-[0_0_0_1.5px_var(--color-accent)]' : 'bg-mist text-ink-mute'}`}>
                {l.n <= st.stage ? <Check className="size-3.5" strokeWidth={3} /> : l.n}
              </span>
              <span className="min-w-0">
                <span className={`block font-medium ${available ? '' : 'text-ink-mute'}`}>{l.title}</span>
                <span className="block text-xs text-ink-mute">{available ? l.cats.filter((c) => agreed?.includes(c)).map(catTitle).join('  ·  ') : 'Not in the categories you both chose.'}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {target ? (
        <div className="space-y-3 rounded-[12px] bg-white p-5 shadow-lift">
          <p className="font-medium">
            Next: stage {target}, {VAULT_STAGES[target - 1]!.title}
          </p>
          <p className="text-sm text-ink-soft">
            {votes[me] && !votes[partner] && `You are in. Waiting for ${names[partner]}, who can say no without a reason.`}
            {!votes[me] && votes[partner] && `${names[partner]} is in. Only join if you want to.`}
            {!votes[me] && !votes[partner] && 'You both need to opt in.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {votes[me] ? (
              <Button variant="secondary" loading={busy === 'undo'} onClick={() => run('undo', () => s.remove(key))}>
                Withdraw
              </Button>
            ) : (
              <Button loading={busy === 'in'} onClick={() => run('in', () => s.submit(key, {}))}>
                Opt in to stage {target}
              </Button>
            )}
            {st.stage > 0 && (
              <Button variant="ghost" loading={busy === 'end'} onClick={() => run('end', () => s.complete())}>
                Stop here and see results
              </Button>
            )}
          </div>
        </div>
      ) : (
        <FinishButton s={s} note={st.stage === 0 ? 'None of the stages match the categories you both chose. Open Boundaries to include more.' : 'That was the last stage your shared categories allow.'} />
      )}
    </div>
  );
}

/* ----------------------------------- atlas ---------------------------------- */

function AtlasBrowser({ view, s }: ModeProps) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [open, setOpen] = useState<VItem | null>(null);
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner = other(me);
  const cards = searchAtlas(VELVET, query, group);
  const all = VELVET.filter((q) => q.cat === 'atlas');
  const doneCount = all.filter((q) => roundDone(view, q, atlasKey(q))).length;

  if (open) {
    return (
      <div className="space-y-5">
        <button type="button" onClick={() => setOpen(null)} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-mute hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to the Atlas
        </button>
        <Round key={open.id} view={view} s={s} q={open} k={atlasKey(open)} answerer={1} index={all.indexOf(open)} total={all.length} label={open.group ?? 'Kink & Fetish Atlas'} onSkip={() => setOpen(null)} onNext={async () => setOpen(null)} nextLabel="Back to the Atlas" skipLabel="Not now" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-accent">Kink & Fetish Atlas</p>
          <h1 className="mt-1 text-[1.6rem] font-semibold tracking-[-0.02em]">Explore the Atlas</h1>
          <p className="mt-1 text-ink-soft">Open any card, choose privately, reveal together. {doneCount} of {all.length} answered by you both.</p>
        </div>
        <FinishInline s={s} />
      </div>
      <label className="flex h-11 items-center gap-2 rounded-[8px] bg-white px-3.5 shadow-[0_0_0_1px_var(--color-line-strong)] focus-within:shadow-[0_0_0_1px_var(--color-accent),0_0_0_3px_rgb(201_79_120/0.16)]">
        <Search className="size-4 text-ink-mute" aria-hidden="true" />
        <span className="sr-only">Search the Atlas</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search: blindfold, roleplay, lingerie..." className="h-full flex-1 bg-transparent outline-none placeholder:text-ink-mute/70" />
      </label>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {[null, ...ATLAS_GROUPS].map((g) => (
          <button key={g ?? 'all'} type="button" aria-pressed={group === g} onClick={() => setGroup(g)} className={`shrink-0 rounded-[6px] px-3 py-1.5 text-sm font-medium ${group === g ? 'bg-accent text-white' : 'bg-white text-ink-soft shadow-hairline hover:text-ink'}`}>
            {g ?? 'All'}
          </button>
        ))}
      </div>
      {cards.length === 0 ? (
        <p className="rounded-[10px] bg-mist px-4 py-6 text-center text-sm text-ink-mute">Nothing matches that search.</p>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {cards.map((q) => {
            const k = atlasKey(q);
            const mine = Boolean(entriesFor(view, `pub:xd${k}`)[me]);
            const theirs = Boolean(entriesFor(view, `pub:xd${k}`)[partner]);
            const pair = mine && theirs ? pairFor(view, q, k) : null;
            return (
              <li key={q.id}>
                <button type="button" onClick={() => setOpen(q)} className="flex h-full w-full flex-col rounded-[10px] bg-white p-4 text-left shadow-hairline transition-shadow hover:shadow-lift">
                  <span className="text-xs font-medium text-ink-mute">{q.group}</span>
                  <span className="mt-1 font-semibold">{q.text}</span>
                  <span className="mt-0.5 text-sm text-ink-soft">{q.setup}</span>
                  <span className="mt-3 flex flex-wrap gap-1.5 text-xs font-medium">
                    {mine && theirs ? (
                      <span className={`rounded-[4px] px-1.5 py-0.5 ${pair && (pair.v === 'mutual' || pair.v === 'discuss') ? 'bg-accent text-white' : 'bg-shell text-accent-deep'}`}>
                        {pair ? (pair.v === 'mutual' ? 'Mutual curiosity' : pair.v === 'discuss' ? 'Marked for discussion' : 'Revealed') : 'Answered by both'}
                      </span>
                    ) : (
                      <>
                        <span className={`rounded-[4px] px-1.5 py-0.5 ${mine ? 'bg-shell text-accent-deep' : 'bg-mist text-ink-mute'}`}>{mine ? 'You answered' : 'Not answered'}</span>
                        {theirs && <span className="rounded-[4px] bg-mist px-1.5 py-0.5 text-ink-mute">{names[partner]} answered</span>}
                      </>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FinishInline({ s }: { s: SessionApi }) {
  const { busy, run } = useBusy();
  return (
    <Button variant="secondary" size="sm" loading={busy === 'c'} onClick={() => run('c', () => s.complete())}>
      See results
    </Button>
  );
}

/* ----------------------------------- round ---------------------------------- */

function Heat({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Heat ${n} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`size-1.5 rounded-full ${i <= n ? 'bg-accent' : 'bg-line'}`} />
      ))}
    </span>
  );
}

function loadShare(): Share | null {
  try {
    const v = sessionStorage.getItem('velvet:share');
    return v === 'together' || v === 'now' || v === 'private' ? v : null;
  } catch {
    return null;
  }
}
function saveShare(v: Share) {
  try {
    sessionStorage.setItem('velvet:share', v);
  } catch {
    /* per-device convenience only */
  }
}

function Round({
  view,
  s,
  q,
  k,
  answerer,
  index,
  total,
  label,
  onSkip,
  onNext,
  nextLabel,
  skipLabel = 'Skip',
}: {
  view: SessionView;
  s: SessionApi;
  q: VItem;
  k: string;
  answerer: PlayerNumber;
  index: number;
  total: number;
  label: string;
  onSkip: () => Promise<unknown> | void;
  onNext: () => Promise<unknown>;
  nextLabel: string;
  skipLabel?: string;
}) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner = other(me);
  const permission = needsShare(q);
  const sealKey = `seal:x${k}`;
  const seal = entriesFor<Answer>(view, sealKey);
  const marker = entriesFor<{ share: Share }>(view, `pub:xd${k}`);
  const mineDone = permission ? Boolean(marker[me]) : Boolean(seal[me]);
  const done = roundDone(view, q, k);
  const just = useJustRevealed(k, done);
  const [holding, setHolding] = useState(false);
  const [picks, setPicks] = useDraft<string[]>(`v${k}`, []);
  const [share, setShareState] = useState<Share | null>(loadShare);
  const setShare = (v: Share) => {
    setShareState(v);
    saveShare(v);
  };

  useEffect(() => {
    if (!just) return;
    setHolding(true);
    const t = window.setTimeout(() => setHolding(false), 1100);
    return () => window.clearTimeout(t);
  }, [just]);

  const predictor = q.kind === 'predict' && me !== answerer;
  const heading = predictor ? (q.them ?? q.text).replaceAll('{name}', names[answerer]) : q.text;
  const ready = validVelvet(q, picks) && (!permission || share !== null);
  const partnerIn = permission ? Boolean(marker[partner]) : partnerHasPending(view, sealKey) || Boolean(seal[partner]);
  const scale = q.kind === 'scale' || q.kind === 'atlas';

  async function lock() {
    const payload: Answer = { id: q.id, picks };
    if (!permission) return s.submit(sealKey, payload);
    if (share === 'private') await s.submit(`priv:x${k}`, payload);
    else {
      await s.submit(sealKey, payload);
      if (share === 'now') await s.submit(`pub:xs${k}`, payload);
    }
    await s.submit(`pub:xd${k}`, { share });
  }

  return (
    <div className="space-y-6">
      <StepProgress index={index} total={total} label={label} />
      <article className="animate-flip rounded-[14px] bg-white p-6 shadow-lift sm:p-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-medium text-accent">{catTitle(q.cat)}</span>
          <Heat n={q.intensity} />
        </div>
        {q.setup && !scale && <p className="reading mt-3 border-l-2 border-shell pl-4 text-[1.06rem] leading-relaxed text-ink">{q.setup}</p>}
        {q.kind === 'predict' && (
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
            <Avatar name={names[answerer]} seat={answerer} size="xs" />
            {predictor ? `Predict ${names[answerer]}'s answer.` : `Answer for yourself. ${names[partner]} is predicting.`}
          </p>
        )}
        <h1 className={`mt-2 font-semibold tracking-[-0.015em] text-balance ${scale ? 'text-[1.6rem]' : 'text-[1.3rem] leading-snug sm:text-[1.45rem]'}`}>{heading}</h1>
        {scale && q.setup && <p className="mt-1.5 text-[1.02rem] leading-relaxed text-ink-soft">{q.setup}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {q.maxPicks === 2 && <span className="rounded-[4px] bg-shell px-2 py-0.5 text-xs font-semibold text-accent-deep">Choose up to 2</span>}
          {q.maxPicks === 4 && <span className="rounded-[4px] bg-shell px-2 py-0.5 text-xs font-semibold text-accent-deep">Select all that apply</span>}
          {permission && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft">
              <LockKeyhole className="size-3 text-accent" aria-hidden="true" /> You choose who sees this
            </span>
          )}
        </div>
      </article>

      {holding ? (
        <div className="grid place-items-center rounded-[14px] bg-shell px-6 py-12 text-center" role="status">
          <div className="flex -space-x-2">
            {([1, 2] as PlayerNumber[]).map((seat, i) => (
              <span key={seat} className="animate-pulse-soft" style={{ animationDelay: `${i * 200}ms` }}>
                <Avatar name={names[seat]} seat={seat} className="rounded-full ring-2 ring-shell" />
              </span>
            ))}
          </div>
          <p className="mt-3 font-medium text-accent-deep">Both locked in. Revealing...</p>
        </div>
      ) : done ? (
        <Reveal view={view} s={s} q={q} k={k} answerer={answerer} animate={just} onNext={onNext} nextLabel={nextLabel} />
      ) : !mineDone ? (
        <div className="space-y-5">
          <div role={q.maxPicks > 1 ? 'group' : 'radiogroup'} aria-label="Your answer" className={scale ? 'grid gap-2 sm:grid-cols-2' : 'grid gap-2.5'}>
            {q.options.map((o) => {
              const on = picks.includes(o.id);
              const blocked = !on && q.maxPicks > 1 && picks.length >= q.maxPicks;
              return (
                <button
                  key={o.id}
                  type="button"
                  role={q.maxPicks > 1 ? 'checkbox' : 'radio'}
                  aria-checked={on}
                  disabled={blocked}
                  onClick={() => setPicks(toggleVelvet(q, picks, o.id))}
                  className={`flex w-full items-start gap-3.5 rounded-[10px] px-4 py-3.5 text-left transition-[box-shadow,background-color,transform] duration-150 active:scale-[0.99] ${
                    on ? 'bg-shell shadow-[0_0_0_2px_var(--color-accent)]' : 'bg-white shadow-hairline hover:shadow-lift'
                  } ${blocked ? 'opacity-55' : ''} ${scale && o.id === 'private' ? 'sm:col-span-2' : ''}`}
                >
                  <span className={`mt-0.5 grid size-5 shrink-0 place-items-center text-[0.7rem] font-semibold uppercase transition-colors ${q.maxPicks > 1 ? 'rounded-[4px]' : 'rounded-full'} ${on ? 'bg-accent text-white' : 'text-ink-mute shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]'}`} aria-hidden="true">
                    {on ? <Check className="size-3" strokeWidth={3} /> : scale ? '' : o.id}
                  </span>
                  <span className="text-[1rem] leading-snug">{o.text}</span>
                </button>
              );
            })}
          </div>
          {permission && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Who sees your answer?</legend>
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Who sees your answer?">
                {SHARE_OPTIONS.map((o) => (
                  <button key={o.id} type="button" role="radio" aria-checked={share === o.id} onClick={() => setShare(o.id)} className={`rounded-[6px] px-3 py-2.5 text-left text-sm font-medium ${share === o.id ? 'bg-shell text-accent-deep shadow-[0_0_0_1.5px_var(--color-accent)]' : 'bg-white shadow-[0_0_0_1px_var(--color-line-strong)] hover:bg-mist'}`}>
                    {o.text}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <Button size="lg" block disabled={!ready} loading={busy === 'lock'} onClick={() => run('lock', lock)}>
            {predictor ? 'Lock in my prediction' : 'Lock in'}
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-ink-mute">{partnerIn ? `${names[partner]} has answered.` : `${names[partner]} can't see your answer until the reveal.`}</span>
            <button type="button" disabled={busy !== null} onClick={() => run('skip', async () => onSkip())} className="inline-flex items-center gap-1 font-medium text-ink-mute hover:text-ink">
              <SkipForward className="size-3.5" aria-hidden="true" /> {skipLabel}
            </button>
          </div>
          {permission && marker[partner]?.payload.share === 'now' && <PartnerOpen view={view} q={q} k={k} />}
        </div>
      ) : (
        <div className="space-y-3">
          <Waiting>Locked in. Waiting for {names[partner]}.</Waiting>
          <p className="text-center text-sm text-ink-mute">
            Rather not wait?{' '}
            <button type="button" disabled={busy !== null} onClick={() => run('skip', async () => onSkip())} className="font-medium text-ink-soft underline-offset-2 hover:underline">
              Skip it
            </button>
            . Nothing is revealed.
          </p>
        </div>
      )}
    </div>
  );
}

function PartnerOpen({ view, q, k }: { view: SessionView; q: VItem; k: string }) {
  const [open, setOpen] = useState(false);
  const names = seatNames(view);
  const partner = other(view.me.player_number);
  const a = entriesFor<Answer>(view, `pub:xs${k}`)[partner];
  if (!a) return null;
  return (
    <p className="rounded-[10px] bg-shell px-4 py-3 text-sm">
      {open ? (
        <>
          <span className={`font-medium ${seatTone[partner].text}`}>{names[partner]}: </span>
          {optText(q, a.payload.picks)}
        </>
      ) : (
        <>
          {names[partner]} revealed their answer already.{' '}
          <button type="button" onClick={() => setOpen(true)} className="font-medium text-accent-deep underline-offset-2 hover:underline">
            Peek now
          </button>{' '}
          or answer yours first.
        </>
      )}
    </p>
  );
}

/* ---------------------------------- reveal ---------------------------------- */

function Reveal({ view, s, q, k, answerer, animate, onNext, nextLabel }: { view: SessionView; s: SessionApi; q: VItem; k: string; answerer: PlayerNumber; animate: boolean; onNext: () => Promise<unknown>; nextLabel: string }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner = other(me);
  const mine = visibleAnswer(view, k, me);
  const theirs = visibleAnswer(view, k, partner);
  const pair = pairFor(view, q, k);
  const later = entriesFor(view, `pub:later${k}`);
  const permission = needsShare(q);

  return (
    <div className="space-y-5">
      {permission ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {([me, partner] as PlayerNumber[]).map((seat, i) => (
            <AnswerCard key={seat} view={view} s={s} q={q} k={k} seat={seat} v={seat === me ? mine : theirs} mineShare={mine.share} animate={animate} delay={i * 140} />
          ))}
        </div>
      ) : (
        <ul className="grid gap-2.5" aria-label="Revealed answers">
          {q.options.map((o) => {
            const who = ([me, partner] as PlayerNumber[]).filter((seat) => (seat === me ? mine.a : theirs.a)?.picks.includes(o.id));
            const both = who.length === 2;
            return (
              <li key={o.id} className={`flex items-start gap-3.5 rounded-[10px] px-4 py-3.5 ${both ? 'bg-shell shadow-[0_0_0_2px_var(--color-accent)]' : who.length ? 'bg-white shadow-lift' : 'bg-white/60 opacity-55 shadow-hairline'} ${both && animate ? 'animate-land' : ''}`}>
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center text-[0.7rem] font-semibold text-ink-mute uppercase" aria-hidden="true">
                  {o.id}
                </span>
                <span className="flex-1 leading-snug">{o.text}</span>
                <span className="flex shrink-0 -space-x-1.5">
                  {who.map((seat, i) => (
                    <span key={seat} className={animate ? 'animate-land' : ''} style={animate ? { animationDelay: `${150 + i * 160}ms` } : undefined} title={q.kind === 'predict' ? (seat === answerer ? 'Answer' : 'Prediction') : undefined}>
                      <Avatar name={names[seat]} seat={seat} size="sm" className="rounded-full ring-2 ring-white" />
                    </span>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {pair && <p className={`text-[1.05rem] font-medium ${['same', 'mutual', 'discuss'].includes(pair.v) ? 'text-accent-deep' : 'text-ink'}`}>{velvetVerdictText(pair.v, q.kind === 'predict')}</p>}
      {q.kind === 'predict' && <PredictionScore view={view} />}

      <FollowUp view={view} s={s} q={q} k={k} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          size="sm"
          variant="ghost"
          icon={<Bookmark className={`size-4 ${later[me] ? 'fill-accent text-accent' : ''}`} />}
          aria-pressed={Boolean(later[me])}
          loading={busy === 'later'}
          onClick={() => run('later', () => (later[me] ? s.remove(`pub:later${k}`) : s.submit(`pub:later${k}`, { id: q.id })))}
        >
          {later[me] ? 'Marked for later' : 'Talk about this later'}
        </Button>
      </div>
      <Button size="lg" block loading={busy === 'next'} onClick={() => run('next', onNext)}>
        {nextLabel}
      </Button>
    </div>
  );
}

function AnswerCard({ view, s, q, k, seat, v, mineShare, animate, delay }: { view: SessionView; s: SessionApi; q: VItem; k: string; seat: PlayerNumber; v: { a?: Answer; share?: Share }; mineShare?: Share; animate: boolean; delay: number }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const mineCard = seat === me;
  const sharedNow = Boolean(entriesFor(view, `pub:xs${k}`)[me]);
  const openAnswer = v.a && ['yes', 'curious', 'discuss'].includes(v.a.picks[0] ?? '');
  return (
    <div className={`rounded-[12px] p-4 ${openAnswer && !mineCard ? 'bg-shell' : 'bg-white shadow-hairline'} ${animate ? 'animate-flip' : ''}`} style={animate ? { animationDelay: `${delay}ms` } : undefined}>
      <div className="flex items-center gap-2">
        <Avatar name={names[seat]} seat={seat} size="xs" />
        <span className={`text-sm font-medium ${seatTone[seat].text}`}>{mineCard ? 'You' : names[seat]}</span>
      </div>
      {v.a ? (
        <p className="mt-2 text-[1.12rem] leading-snug font-semibold">{optText(q, v.a.picks)}</p>
      ) : v.share === 'private' ? (
        <p className="mt-2 flex items-start gap-2 text-ink-soft">
          <EyeOff className="mt-1 size-4 shrink-0" aria-hidden="true" /> <span>Your partner marked this as private.</span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">{names[seat]} chose to reveal only if you both shared. Yours is private, so theirs stays hidden too.</p>
      )}
      {mineCard &&
        (v.share === 'private' && !sharedNow ? (
          <div className="mt-3 border-t border-line pt-3 text-sm text-ink-soft">
            <p className="flex items-center gap-1.5">
              <EyeOff className="size-3.5" aria-hidden="true" /> Only you can see this.
            </p>
            {v.a && (
              <button type="button" disabled={busy !== null} className="mt-1.5 text-sm font-semibold text-accent hover:text-accent-deep" onClick={() => run('share', () => s.submit(`pub:xs${k}`, v.a!))}>
                {busy === 'share' ? 'Sharing...' : `Reveal it to ${names[other(me)]}`}
              </button>
            )}
          </div>
        ) : (
          <p className="mt-3 border-t border-line pt-3 text-xs text-ink-mute">{sharedNow ? 'Revealed to your partner.' : mineShare === 'together' && !entriesFor(view, `seal:x${k}`)[other(me)] ? 'Hidden from your partner, because theirs is private.' : 'Revealed together.'}</p>
        ))}
    </div>
  );
}

function FollowUp({ view, s, q, k }: { view: SessionView; s: SessionApi; q: VItem; k: string }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner = other(me);
  const f = FOLLOW_UPS[q.followUp];
  const picks = entriesFor<{ o: string }>(view, `pub:fu${k}`);
  const text = (id?: string) => f.options.find((o) => o.id === id)?.text;
  return (
    <div className="rounded-[12px] bg-shell p-4 sm:p-5">
      <p className="text-xs font-medium tracking-wide text-ink-mute uppercase">Follow-up</p>
      <p className="mt-1 font-semibold">{f.text}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {f.options.map((o) => {
          const on = picks[me]?.payload.o === o.id;
          const theirs = picks[me] && picks[partner]?.payload.o === o.id;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              disabled={busy !== null}
              onClick={() => run('fu', () => s.submit(`pub:fu${k}`, { o: o.id }))}
              className={`flex items-center justify-between gap-2 rounded-[8px] px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${on ? 'bg-accent text-white' : 'bg-white text-ink hover:bg-mist'}`}
            >
              <span>{o.text}</span>
              {theirs && <Avatar name={names[partner]} seat={partner} size="xs" className="rounded-full ring-2 ring-white" />}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-mute">
        {picks[me] && picks[partner] ? `${names[partner]} chose: ${text(picks[partner]!.payload.o)}` : picks[partner] ? `${names[partner]} has answered. Pick yours to see it.` : 'Optional. Your partner sees your pick.'}
      </p>
    </div>
  );
}

/* ------------------------------ scores & results ----------------------------- */

interface Played {
  k: string;
  q: VItem;
  i: number;
}

function playedRounds(view: SessionView): Played[] {
  const st = readState(view.session.state);
  const out: Played[] = st.qs.map((id, i) => ({ k: String(i), q: velvetById(id)!, i })).filter((r) => r.q && roundDone(view, r.q, r.k));
  for (const q of VELVET) if (q.cat === 'atlas' && roundDone(view, q, atlasKey(q))) out.push({ k: atlasKey(q), q, i: -1 });
  return out;
}

function predictionScore(view: SessionView) {
  const score: Record<PlayerNumber, { right: number; tries: number }> = { 1: { right: 0, tries: 0 }, 2: { right: 0, tries: 0 } };
  for (const r of playedRounds(view)) {
    if (r.q.kind !== 'predict') continue;
    const pair = pairFor(view, r.q, r.k);
    if (!pair) continue;
    const predictor = other(answererFor(r.i));
    score[predictor].tries++;
    if (pair.v === 'same') score[predictor].right++;
  }
  return score;
}

function PredictionScore({ view }: { view: SessionView }) {
  const names = seatNames(view);
  const me = view.me.player_number;
  const sc = predictionScore(view);
  return (
    <p className="text-sm text-ink-mute">
      Prediction accuracy: {([me, other(me)] as PlayerNumber[]).map((seat) => `${seat === me ? 'You' : names[seat]} ${sc[seat].right}/${sc[seat].tries}`).join(', ')}. It only counts guesses.
    </p>
  );
}

function Results({ view }: ModeProps) {
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner = other(me);
  const st = readState(view.session.state);
  const rounds = playedRounds(view).map((r) => ({ ...r, pair: pairFor(view, r.q, r.k), mine: visibleAnswer(view, r.k, me), theirs: visibleAnswer(view, r.k, partner) }));
  const withPair = rounds.filter((r) => r.pair && r.q.kind !== 'predict');
  const shared = withPair.filter((r) => r.pair!.v === 'same' || r.pair!.v === 'overlap');
  const mutual = withPair.filter((r) => r.pair!.v === 'mutual');
  const discuss = withPair.filter((r) => r.pair!.v === 'discuss');
  const different = withPair.filter((r) => r.pair!.v === 'different' || r.pair!.v === 'one-open' || r.pair!.v === 'overlap');
  const privateRows = rounds
    .filter((r) => r.mine.share === 'private' || r.theirs.share === 'private' || r.pair?.v === 'private')
    .map((r) => ({
      q: r.q,
      who:
        r.mine.share === 'private' && r.theirs.share === 'private'
          ? 'You both kept this private.'
          : r.mine.share === 'private' || r.mine.a?.picks.includes('private')
            ? 'You kept this private.'
            : 'Your partner marked this as private.',
    }));
  const laterKeys = new Set(entriesWithPrefix(view, 'pub:later').map((e) => e.key.slice('pub:later'.length)));
  const later = rounds.filter((r) => laterKeys.has(r.k));
  const score = predictionScore(view);
  const mineOf = (p: { a: string[]; b: string[] }) => (me === 1 ? p.a : p.b);
  const theirsOf = (p: { a: string[]; b: string[] }) => (me === 1 ? p.b : p.a);
  const pairLine = (r: (typeof rounds)[number]) => (
    <>
      <p className="text-sm text-ink-mute">{r.q.text}</p>
      <p className="mt-1 text-sm">
        <span className={`font-medium ${seatTone[me].text}`}>You: </span>
        {optText(r.q, mineOf(r.pair!))}
      </p>
      <p className="mt-0.5 text-sm">
        <span className={`font-medium ${seatTone[partner].text}`}>{names[partner]}: </span>
        {optText(r.q, theirsOf(r.pair!))}
      </p>
    </>
  );

  return (
    <Recap
      view={view}
      mode="velvet"
      title="VELVET: Body & Desire"
      stats={[
        ['Answered', rounds.length],
        ['Shared', shared.length],
        ['Mutual curiosity', mutual.length + discuss.length],
        ['Skipped', st.skipped.length],
      ]}
      momentTitle="Our mutual curiosities"
      momentBody={[...mutual, ...discuss].map((r) => r.q.text).join('\n')}
    >
      <section className="rounded-[12px] bg-white p-5 shadow-hairline">
        <h2 className="font-semibold">Tonight in short</h2>
        <p className="mt-1.5 leading-relaxed text-ink-soft">
          You answered {rounds.length} together.
          {shared.length > 0 && ` You share ${shared.length} preference${shared.length === 1 ? '' : 's'}.`}
          {mutual.length + discuss.length > 0 && ` ${mutual.length + discuss.length} ${mutual.length + discuss.length === 1 ? 'topic has' : 'topics have'} mutual curiosity.`}
          {score[1].tries + score[2].tries > 0 && ` Prediction accuracy: you ${score[me].right}/${score[me].tries}, ${names[partner]} ${score[partner].right}/${score[partner].tries}.`}
        </p>
        <p className="mt-3 text-sm text-ink-mute">Shared curiosity is not an agreed plan. Anything real is decided together, later, and either of you can change your mind.</p>
      </section>
      <RecapList title="Shared interests" items={shared.map((r) => (
        <>
          <p className="text-sm text-ink-mute">{r.q.text}</p>
          <p className="mt-1 font-medium">{optText(r.q, mineOf(r.pair!).filter((x) => theirsOf(r.pair!).includes(x)))}</p>
        </>
      ))} />
      <RecapList title="Mutual curiosity" items={mutual.map(pairLine)} />
      <RecapList title="Marked for discussion" items={[...discuss.map(pairLine), ...later.filter((r) => !discuss.includes(r)).map((r) => <span className="font-medium">{r.q.text}</span>)]} />
      <RecapList title="Different preferences" items={different.map(pairLine)} />
      <RecapList title="Kept private" items={privateRows.map((x) => (
        <>
          <p className="text-sm">{x.q.text}</p>
          <p className="mt-0.5 text-sm text-ink-mute">{x.who}</p>
        </>
      ))} />
      <p className="text-sm text-ink-mute">No scores for compatibility, skill or attraction. Skipped questions say nothing about either of you.</p>
    </Recap>
  );
}
