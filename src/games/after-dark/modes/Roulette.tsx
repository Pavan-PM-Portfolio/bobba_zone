import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, RefreshCw, Shuffle, SkipForward } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Note } from '../../../components/session/Parts';
import { entriesWithPrefix, seatNames } from '../../../hooks/useSession';
import { useBusy } from '../../flow';
import type { ModeProps } from '../AfterDark';
import { DARES } from '../content/dares';
import { TRUTHS } from '../content/truths';
import { allowed, categoryTitle, type Category, type Prompt, type Terms } from '../content/taxonomy';
import { Recap, RecapList } from '../Recap';
import { FavouriteButton, PromptCard } from '../shared';

type Spin = { n: number; cat: Category; id: string; by: number; done: string[]; skipped: string[] };
const WHEEL_CATS: Category[] = ['flirty', 'romantic', 'compliments', 'bold', 'kissing', 'dates', 'playful'];
const BY_ID: Record<string, Prompt> = Object.fromEntries([...TRUTHS, ...DARES].map((p) => [p.id, p]));
const SEG_COLORS = ['#FBE2E9', '#FFF0F4', '#F6D3DE', '#FFF7F9'];

/** Eligible prompts per category, respecting the agreed level, categories and content type. */
export function poolFor(cat: Category, terms: Terms): Prompt[] {
  const dares = terms.type === 'questions' ? [] : DARES.filter((p) => p.category === cat && allowed(p, terms));
  const truths = terms.type === 'challenges' ? [] : TRUTHS.filter((p) => p.category === cat && allowed(p, terms));
  return dares.length ? dares : truths;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export default function Roulette({ view, s, terms }: ModeProps) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const state = view.session.state.roulette as Spin | undefined;
  const segments = useMemo(() => WHEEL_CATS.filter((c) => poolFor(c, terms).length > 0), [terms]);
  const seg = 360 / Math.max(1, segments.length);

  // Rotation follows the shared spin result, so both screens land on the same segment.
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const lastN = useRef<number | null>(null);
  useEffect(() => {
    if (!state) return;
    const idx = Math.max(0, segments.indexOf(state.cat));
    const target = 360 - (idx * seg + seg / 2);
    if (lastN.current === null) {
      setRotation(target);
    } else if (lastN.current !== state.n) {
      setRotation((r) => r - (r % 360) + 360 * 5 + target);
      if (!prefersReducedMotion()) {
        setSpinning(true);
        const t = setTimeout(() => setSpinning(false), 3200);
        lastN.current = state.n;
        return () => clearTimeout(t);
      }
    }
    lastN.current = state.n;
  }, [state, segments, seg]);

  if (view.session.status === 'completed') return <RouletteRecap view={view} s={s} terms={terms} />;
  if (!segments.length) return <Note tone="pink">None of the roulette categories are in your shared boundaries. Open Boundaries to include some.</Note>;

  const current = state ? BY_ID[state.id] : null;
  const used = state ? [...state.done, ...state.skipped] : [];

  const spin = () =>
    run('spin', () =>
      s.patch((st) => {
        const prev = st.roulette as Spin | undefined;
        if (prev && state && prev.n !== state.n) return null; // someone else just spun
        const prevUsed = prev ? [...prev.done, ...prev.skipped] : [];
        const cats = segments.filter((c) => poolFor(c, terms).some((p) => !prevUsed.includes(p.id)));
        const from = cats.length ? cats : segments;
        const cat = from[Math.floor(Math.random() * from.length)]!;
        const pool = poolFor(cat, terms).filter((p) => !prevUsed.includes(p.id));
        const pick = (pool.length ? pool : poolFor(cat, terms))[Math.floor(Math.random() * (pool.length || poolFor(cat, terms).length))]!;
        return { roulette: { n: (prev?.n ?? 0) + 1, cat, id: pick.id, by: view.me.player_number, done: prev?.done ?? [], skipped: prev?.skipped ?? [] } };
      }),
    );

  const mark = (k: 'done' | 'skipped') =>
    run(k, () =>
      s.patch((st) => {
        const prev = st.roulette as Spin | undefined;
        if (!prev || prev.n !== state?.n || prev[k].includes(prev.id)) return null;
        return { roulette: { ...prev, [k]: [...prev[k], prev.id] } };
      }),
    );

  const alternative = () =>
    run('alt', () =>
      s.patch((st) => {
        const prev = st.roulette as Spin | undefined;
        if (!prev || prev.n !== state?.n) return null;
        const cur = BY_ID[prev.id]!;
        const alts = poolFor(prev.cat, terms).filter((p) => p.id !== prev.id && p.level <= cur.level && ![...prev.done, ...prev.skipped].includes(p.id));
        if (!alts.length) return null;
        return { roulette: { ...prev, id: alts[Math.floor(Math.random() * alts.length)]!.id } };
      }),
    );

  const settled = current && !spinning;
  const resolved = state && (state.done.includes(state.id) || state.skipped.includes(state.id));
  const altAvailable = current && poolFor(state!.cat, terms).some((p) => p.id !== current.id && p.level <= current.level && !used.includes(p.id));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
      <div className="mx-auto w-full max-w-[22rem]">
        <div className="relative aspect-square">
          <div className="absolute top-[-6px] left-1/2 z-10 -translate-x-1/2" aria-hidden="true">
            <div className="h-0 w-0 border-x-[10px] border-t-[16px] border-x-transparent border-t-accent-deep" />
          </div>
          <div
            className="size-full rounded-full shadow-lift"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 3.1s cubic-bezier(0.16, 0.84, 0.2, 1)' : 'none',
              background: `conic-gradient(${segments.map((_, i) => `${SEG_COLORS[i % SEG_COLORS.length]} ${i * seg}deg ${(i + 1) * seg}deg`).join(', ')})`,
            }}
            role="img"
            aria-label={`Roulette wheel with ${segments.map(categoryTitle).join(', ')}`}
          >
            {segments.map((c, i) => (
              <div key={c} className="absolute inset-0" style={{ transform: `rotate(${i * seg + seg / 2}deg)` }} aria-hidden="true">
                <span className="absolute top-[9%] left-1/2 -translate-x-1/2 text-center text-[0.72rem] leading-tight font-semibold text-accent-deep" style={{ width: '5.5rem' }}>
                  {categoryTitle(c)}
                </span>
              </div>
            ))}
            {segments.map((_, i) => (
              <div key={`l${i}`} className="absolute inset-0" style={{ transform: `rotate(${i * seg}deg)` }} aria-hidden="true">
                <span className="absolute top-0 left-1/2 h-1/2 w-px -translate-x-1/2 bg-white/80" />
              </div>
            ))}
          </div>
          <div className="absolute inset-[38%] grid place-items-center rounded-full bg-white shadow-lift">
            <Shuffle className="size-5 text-accent" aria-hidden="true" />
          </div>
        </div>
        <Button size="lg" block className="mt-5" loading={busy === 'spin' || spinning} onClick={spin}>
          {state ? 'Spin again' : 'Spin the wheel'}
        </Button>
        <p className="tabular mt-3 text-center text-sm text-ink-mute">
          {state ? `${state.done.length} completed, ${state.skipped.length} skipped` : 'Either of you can spin.'}
        </p>
      </div>

      <div className="space-y-4" aria-live="polite">
        {!state && <Note>The wheel only lands on categories you both included. Whatever it picks is a suggestion, never an obligation.</Note>}
        {state && spinning && <p className="py-10 text-center text-ink-mute">Spinning...</p>}
        {settled && current && (
          <>
            <PromptCard
              animateKey={`${state!.n}-${current.id}`}
              kicker={`${categoryTitle(state!.cat)}, spun by ${names[state!.by as 1 | 2]}`}
              aside={<FavouriteButton view={view} s={s} id={current.id} text={current.text} />}
            >
              {current.text}
            </PromptCard>
            {resolved ? (
              <Note tone="pink">{state!.done.includes(state!.id) ? 'Marked as done.' : 'Skipped. No problem.'} Spin again whenever you like.</Note>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button icon={<Check className="size-4" />} loading={busy === 'done'} onClick={() => mark('done')}>
                  Done
                </Button>
                {altAvailable && (
                  <Button variant="secondary" icon={<RefreshCw className="size-4" />} loading={busy === 'alt'} onClick={alternative}>
                    Something gentler or similar
                  </Button>
                )}
                <Button variant="ghost" icon={<SkipForward className="size-4" />} loading={busy === 'skipped'} onClick={() => mark('skipped')}>
                  Skip
                </Button>
              </div>
            )}
          </>
        )}
        <div className="border-t border-line pt-4">
          <Button variant="ghost" loading={busy === 'end'} onClick={() => run('end', () => s.complete())}>
            Finish and see the recap
          </Button>
        </div>
      </div>
    </div>
  );
}

function RouletteRecap({ view }: ModeProps) {
  const st = view.session.state.roulette as Spin | undefined;
  const done = st?.done ?? [];
  return (
    <Recap
      view={view}
      mode="roulette"
      title="Dare Roulette"
      stats={[
        ['Spins', st?.n ?? 0],
        ['Completed', done.length],
        ['Skipped', st?.skipped.length ?? 0],
        ['Favourites', entriesWithPrefix(view, 'pub:fav:').length],
      ]}
      momentTitle={`Dare Roulette: ${done.length} done`}
      momentBody={done.map((id) => BY_ID[id]?.text).filter(Boolean).join('\n')}
    >
      <RecapList title="What you did" items={done.map((id) => BY_ID[id]?.text ?? '')} />
    </Recap>
  );
}
