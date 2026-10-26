import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, Flame, ListChecks, LockKeyhole, Star, Trash2 } from 'lucide-react';
import { Shell } from '../components/ui/Shell';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { FullPageLoader } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import { MODES, modeById, type ModeId } from '../games/after-dark/modes';
import { CATEGORIES, LEVELS, type Category } from '../games/after-dark/content/taxonomy';
import { DECKS, type Deck } from '../games/after-dark/content/mcq/types';
import { loadDefaults, saveDefaults, type Defaults } from '../games/after-dark/prefs';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toAppError, type AppError } from '../lib/errors';
import { rememberedName } from '../lib/prefs';
import { relativeTime, shortDate } from '../lib/time';
import type { Dashboard, Moment } from '../lib/types';

export default function AfterDarkHome() {
  const navigate = useNavigate();
  const toast = useToast();
  const { accountName } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [defaults, setDefaults] = useState<Defaults>(loadDefaults);
  const [starting, setStarting] = useState<string | null>(null);
  const [decks, setDecks] = useState<Deck[]>(DECKS.map((d) => d.id));
  const [rounds, setRounds] = useState(12);
  const [desireStyle, setDesireStyle] = useState<'mixed' | 'ladder'>('ladder');
  const [desireRounds, setDesireRounds] = useState(15);
  const [removing, setRemoving] = useState<Moment | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.dashboard().then(setData).catch((e) => setError(toAppError(e)));
  }, []);
  useEffect(load, [load]);

  const updateDefaults = (d: Defaults) => {
    setDefaults(d);
    saveDefaults(d);
  };

  async function start(mode: ModeId, extra: Record<string, unknown> = {}, tag: string = mode) {
    setStarting(tag);
    try {
      const name = rememberedName() || accountName || 'Player';
      const r = await api.createSession('after_dark', name, { mode, rounds: mode === 'truth_dare' ? 12 : undefined, ...extra });
      navigate(`/play/${r.session_id}`);
    } catch (e) {
      toast(toAppError(e).message, 'error');
      setStarting(null);
    }
  }

  async function removeFavourite() {
    if (!removing) return;
    setBusy(true);
    try {
      await api.deleteMoment(removing.id);
      setRemoving(null);
      load();
    } catch (e) {
      toast(toAppError(e).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const sessions = (data?.sessions ?? []).filter((s) => s.game === 'after_dark');
  const active = sessions.filter((s) => s.status === 'waiting' || s.status === 'in_progress');
  const recent = sessions.filter((s) => s.status === 'completed');
  const favourites = (data?.moments ?? []).filter((m) => m.game === 'after_dark');
  const modesTried = new Set(recent.map((s) => s.mode)).size;

  return (
    <Shell wide>
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-ink-mute hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden="true" /> Dashboard
      </Link>

      <section className="grid gap-8 border-b border-line pb-10 lg:grid-cols-[1fr_24rem]">
        <div>
          <p className="text-sm font-medium text-accent">18+, just the two of you</p>
          <h1 className="mt-1 text-[2.1rem] leading-tight font-semibold tracking-[-0.03em]">After Dark</h1>
          <p className="mt-2 max-w-[34rem] text-[1.02rem] leading-relaxed text-ink-soft">
            A private game for exploring your chemistry. Flirty to bold, at whatever pace you both choose. Every prompt can be skipped, and only what you both agree to is ever shown.
          </p>
          <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
            <LockKeyhole className="size-4 text-accent" aria-hidden="true" />
            Private to your two accounts. Nothing is public and nothing is shared beyond you.
          </p>
          {active.length > 0 && (
            <Button size="lg" className="mt-6" onClick={() => navigate(`/play/${active[0]!.id}`)}>
              Resume {modeById(active[0]!.mode ?? 'truth_dare').title}
            </Button>
          )}
        </div>

        <div className="rounded-[12px] bg-white p-5 shadow-hairline">
          <p className="font-medium">Your starting preferences</p>
          <p className="mt-0.5 text-sm text-ink-mute">Pre-fills your private setup. Each game still asks you both, and uses only what you share.</p>
          <p className="mt-4 mb-2 text-sm font-medium">Intensity</p>
          <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label="Default intensity">
            {LEVELS.map((l) => (
              <button
                key={l.n}
                type="button"
                role="radio"
                aria-checked={defaults.level === l.n}
                title={l.detail}
                onClick={() => updateDefaults({ ...defaults, level: l.n })}
                className={`rounded-[6px] px-1 py-2 text-center text-xs font-medium ${defaults.level === l.n ? 'bg-accent text-white' : 'bg-mist text-ink-soft hover:bg-shell'}`}
              >
                {l.title}
              </button>
            ))}
          </div>
          <p className="mt-4 mb-2 text-sm font-medium">Categories</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => {
              const on = defaults.include.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => updateDefaults({ ...defaults, include: on ? defaults.include.filter((x) => x !== c.id) : [...defaults.include, c.id as Category] })}
                  className={`inline-flex items-center gap-1 rounded-[6px] px-2.5 py-1.5 text-xs font-medium ${on ? 'bg-shell text-accent-deep shadow-[0_0_0_1px_var(--color-accent)]' : 'bg-mist text-ink-mute'}`}
                >
                  {on && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
                  {c.title}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-[14px] bg-white p-6 shadow-lift sm:p-7" aria-labelledby="qgame">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-[30rem]">
            <span className="grid size-10 place-items-center rounded-[8px] bg-shell text-accent-deep" aria-hidden="true">
              <ListChecks className="size-5" strokeWidth={1.8} />
            </span>
            <h2 id="qgame" className="mt-4 text-[1.35rem] font-semibold tracking-[-0.02em]">The Question Game</h2>
            <p className="mt-1.5 leading-relaxed text-ink-soft">
              Scenarios, desires and deep questions, each with four distinct answers. You both choose in private, lock in, and reveal at the same moment. Five levels, and you only go higher when you both say so.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button size="lg" loading={starting === 'mcq'} disabled={starting !== null || decks.length === 0} onClick={() => start('mcq', { decks, rounds })}>
                Start the Question Game
              </Button>
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                Questions
                <select value={rounds} onChange={(e) => setRounds(Number(e.target.value))} className="h-9 rounded-[6px] bg-white px-2 text-ink shadow-[0_0_0_1px_var(--color-line-strong)]">
                  {[8, 12, 20, 30].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="lg:w-[26rem]">
            <p className="mb-2 text-sm font-medium">Decks</p>
            <ul className="divide-y divide-line rounded-[10px] shadow-[0_0_0_1px_var(--color-line)]">
              {DECKS.map((d) => {
                const on = decks.includes(d.id);
                return (
                  <li key={d.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => setDecks(on ? decks.filter((x) => x !== d.id) : [...decks, d.id])}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <span className={`mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-[4px] ${on ? 'bg-accent text-white' : 'shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]'}`} aria-hidden="true">
                        {on && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{d.title}</span>
                        <span className="block text-xs text-ink-mute">{d.detail}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={starting !== null}
                      onClick={() => start('mcq', { decks: [d.id], rounds }, `deck:${d.id}`)}
                      className="shrink-0 text-xs font-semibold text-accent hover:text-accent-deep disabled:opacity-50"
                    >
                      {starting === `deck:${d.id}` ? 'Starting...' : 'Play only this'}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[14px] bg-shell p-6 sm:p-7" aria-labelledby="desire">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-[32rem]">
            <span className="grid size-10 place-items-center rounded-[8px] bg-white text-accent-deep" aria-hidden="true">
              <Flame className="size-5" strokeWidth={1.8} />
            </span>
            <h2 id="desire" className="mt-4 text-[1.35rem] font-semibold tracking-[-0.02em]">Desire Mode</h2>
            <p className="mt-1.5 leading-relaxed text-ink-soft">
              Turn-ons, kissing and touch, kinks, fantasies and secret curiosities. Each of you privately opts into topics, answers on your own device, and sees the other's answer only at the reveal. Secret answers stay private unless you choose to share them.
            </p>
            <p className="mt-3 text-sm text-ink-mute">For two consenting adults. Interest is never agreement.</p>
          </div>
          <div className="space-y-4 lg:w-[26rem]">
            <div role="radiogroup" aria-label="How to play" className="grid gap-2">
              {(
                [
                  { id: 'ladder', title: 'The Intensity Ladder', detail: 'Five steps, each more personal. You both opt in before every step.' },
                  { id: 'mixed', title: 'Mixed session', detail: 'Questions drawn from every topic you both chose.' },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={desireStyle === o.id}
                  onClick={() => setDesireStyle(o.id)}
                  className={`rounded-[8px] px-4 py-3 text-left ${desireStyle === o.id ? 'bg-white shadow-[0_0_0_2px_var(--color-accent)]' : 'bg-white/70 shadow-hairline hover:bg-white'}`}
                >
                  <span className={`block text-sm font-semibold ${desireStyle === o.id ? 'text-accent-deep' : ''}`}>{o.title}</span>
                  <span className="block text-xs text-ink-mute">{o.detail}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                loading={starting === 'desire'}
                disabled={starting !== null}
                onClick={() => start('desire', desireStyle === 'ladder' ? { style: 'ladder', perStage: 4 } : { style: 'mixed', rounds: desireRounds })}
              >
                Start Desire Mode
              </Button>
              {desireStyle === 'mixed' && (
                <label className="flex items-center gap-2 text-sm text-ink-soft">
                  Questions
                  <select value={desireRounds} onChange={(e) => setDesireRounds(Number(e.target.value))} className="h-9 rounded-[6px] bg-white px-2 text-ink shadow-[0_0_0_1px_var(--color-line-strong)]">
                    {[10, 15, 25, 40].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="modes">
        <h2 id="modes" className="text-[1.05rem] font-semibold">More ways to play</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MODES.filter((m) => !['mcq', 'desire'].includes(m.id)).map((m) => (
            <li key={m.id}>
              <button
                type="button"
                disabled={starting !== null}
                onClick={() => start(m.id)}
                className="group flex h-full w-full flex-col rounded-[10px] bg-white p-5 text-left shadow-hairline transition-shadow hover:shadow-lift disabled:opacity-60"
              >
                <span className="grid size-10 place-items-center rounded-[8px] bg-shell text-accent-deep" aria-hidden="true">
                  <m.icon className="size-5" strokeWidth={1.8} />
                </span>
                <span className="mt-4 font-semibold tracking-[-0.01em]">{m.title}</span>
                <span className="mt-1 flex-1 text-sm leading-relaxed text-ink-soft">{m.description}</span>
                <span className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
                  <span className="text-ink-mute">{m.format}</span>
                  <span className="font-medium text-accent group-hover:text-accent-deep">{starting === m.id ? 'Starting...' : 'Start'}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {error && !data ? (
        <p className="mt-10 rounded-[10px] bg-danger-soft px-4 py-3 text-danger">{error.message}</p>
      ) : !data ? (
        <FullPageLoader label="Loading your sessions" />
      ) : (
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-10">
            {active.length > 0 && (
              <section>
                <h2 className="text-[1.05rem] font-semibold">In progress</h2>
                <ul className="mt-3 divide-y divide-line rounded-[10px] bg-white shadow-hairline">
                  {active.map((s) => (
                    <li key={s.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{modeById(s.mode ?? '').title}</p>
                        <p className="text-sm text-ink-mute">
                          {(s.players?.length ?? 0) < 2 ? `Waiting for your partner, code ${s.invite_code}` : 'In progress'}, {relativeTime(s.updated_at)}
                        </p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => navigate(`/play/${s.id}`)}>
                        Resume
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <h2 className="text-[1.05rem] font-semibold">Recent sessions</h2>
              {recent.length === 0 ? (
                <p className="mt-3 rounded-[10px] bg-mist px-4 py-6 text-center text-sm text-ink-mute shadow-hairline">No sessions yet. Pick a mode above when you're both ready.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line rounded-[10px] bg-white shadow-hairline">
                  {recent.slice(0, 8).map((s) => (
                    <li key={s.id}>
                      <Link to={`/play/${s.id}`} className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-mist sm:px-5">
                        <span className="font-medium">{modeById(s.mode ?? '').title}</span>
                        <span className="text-sm text-ink-mute">{shortDate(s.completed_at ?? s.updated_at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-10">
            <section>
              <h2 className="text-[1.05rem] font-semibold">Your progress</h2>
              <dl className="mt-3 grid grid-cols-3 divide-x divide-line rounded-[10px] bg-white shadow-hairline">
                {[
                  ['Sessions', recent.length],
                  ['Modes tried', `${modesTried}/${MODES.length}`],
                  ['Favourites', favourites.length],
                ].map(([l, n]) => (
                  <div key={l as string} className="px-4 py-4">
                    <dd className="tabular text-xl font-semibold">{n}</dd>
                    <dt className="text-xs text-ink-mute">{l}</dt>
                  </div>
                ))}
              </dl>
              <div className="mt-2 h-1 rounded-[2px] bg-line" aria-hidden="true">
                <div className="h-full rounded-[2px] bg-accent" style={{ width: `${(modesTried / MODES.length) * 100}%` }} />
              </div>
            </section>
            <section>
              <h2 className="text-[1.05rem] font-semibold">Saved favourites</h2>
              {favourites.length === 0 ? (
                <p className="mt-3 flex gap-2.5 rounded-[10px] bg-mist px-4 py-4 text-sm text-ink-mute shadow-hairline">
                  <Star className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  Tap the star on any prompt to keep it here.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {favourites.slice(0, 10).map((m) => (
                    <li key={m.id} className="flex items-start gap-3 rounded-[10px] bg-white p-4 shadow-hairline">
                      <Star className="mt-0.5 size-4 shrink-0 fill-accent text-accent" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{m.title}</p>
                        {m.body && m.body !== 'Favourite After Dark prompt' && <p className="mt-1 line-clamp-3 text-xs whitespace-pre-line text-ink-mute">{m.body}</p>}
                      </div>
                      <button type="button" onClick={() => setRemoving(m)} className="text-ink-mute hover:text-danger" aria-label="Remove favourite">
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      )}

      <Dialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Remove this favourite?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Keep it
            </Button>
            <Button variant="danger" loading={busy} onClick={removeFavourite}>
              Remove
            </Button>
          </>
        }
      >
        It will be removed for both of you.
      </Dialog>
    </Shell>
  );
}
