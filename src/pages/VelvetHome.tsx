import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Disc3, Gem, Layers, LibraryBig, LockKeyhole, Vault as VaultIcon } from 'lucide-react';
import { Shell } from '../components/ui/Shell';
import { Button } from '../components/ui/Button';
import { FullPageLoader } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import { VELVET_CATS } from '../games/after-dark/content/velvet/types';
import { VELVET } from '../games/after-dark/content/velvet';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toAppError, type AppError } from '../lib/errors';
import { rememberedName } from '../lib/prefs';
import { relativeTime, shortDate } from '../lib/time';
import type { Dashboard } from '../lib/types';

const STYLES = [
  { id: 'categories', icon: Layers, title: 'Play by category', detail: 'A mix from every category you both chose.' },
  { id: 'roulette', icon: Disc3, title: 'Desire Roulette', detail: 'Spin the wheel. It picks the category.' },
  { id: 'vault', icon: VaultIcon, title: 'The Velvet Vault', detail: 'Five stages, each more personal. You both opt in to each one.' },
  { id: 'atlas', icon: LibraryBig, title: 'Kink & Fetish Atlas', detail: 'Search every card and answer the ones you like.' },
] as const;
const ATLAS_COUNT = VELVET.filter((q) => q.cat === 'atlas').length;

export default function VelvetHome() {
  const navigate = useNavigate();
  const toast = useToast();
  const { accountName } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  const load = useCallback(() => {
    api.dashboard().then(setData).catch((e) => setError(toAppError(e)));
  }, []);
  useEffect(load, [load]);

  async function start(settings: Record<string, unknown>, tag: string, title: string) {
    setStarting(tag);
    try {
      const name = rememberedName() || accountName || 'Player';
      const r = await api.createSession('velvet', name, { mode: 'velvet', rounds: 15, perStage: 6, ...settings }, title);
      navigate(`/play/${r.session_id}`);
    } catch (e) {
      toast(toAppError(e).message, 'error');
      setStarting(null);
    }
  }

  const sessions = (data?.sessions ?? []).filter((s) => s.game === 'velvet');
  const active = sessions.filter((s) => s.status === 'waiting' || s.status === 'in_progress');
  const recent = sessions.filter((s) => s.status === 'completed');
  const styleOf = (s: { title: string | null }) => s.title ?? 'VELVET';

  return (
    <Shell wide>
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-ink-mute hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden="true" /> Dashboard
      </Link>

      <section className="overflow-hidden rounded-[18px] bg-white shadow-lift">
        <div className="bg-[linear-gradient(135deg,#fff0f4_0%,#fffbfc_65%)] px-6 pt-9 pb-8 sm:px-10">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-accent uppercase">
            <Gem className="size-3.5" aria-hidden="true" /> Velvet · Body &amp; Desire · 18+
          </p>
          <h1 className="reading mt-3 text-[2.4rem] leading-[1.05] font-semibold tracking-[-0.025em] sm:text-[2.9rem]">Tap, choose, reveal together.</h1>
          <p className="mt-3 max-w-[38rem] text-[1.05rem] leading-relaxed text-ink-soft">
            {VELVET.length} sensual, prewritten questions about your body map, what turns you on, fantasies, kinks and secret curiosities. Nothing to type. Each of you answers on your own phone, and private picks stay private.
          </p>
          <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
            <LockKeyhole className="size-4 text-accent" aria-hidden="true" />
            Only categories you both choose are ever played. Choosing something here is never agreeing to do it.
          </p>
          {active.length > 0 && (
            <Button size="lg" className="mt-6" onClick={() => navigate(`/play/${active[0]!.id}`)}>
              Resume your game
            </Button>
          )}
        </div>
        <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {STYLES.map((o) => (
            <button key={o.id} type="button" disabled={starting !== null} onClick={() => start({ style: o.id }, o.id, o.title)} className="group flex flex-col bg-white p-6 text-left transition-colors hover:bg-paper disabled:opacity-60">
              <o.icon className="size-5 text-accent" strokeWidth={1.8} aria-hidden="true" />
              <span className="mt-3 text-[1.05rem] font-semibold">{o.title}</span>
              <span className="mt-1 flex-1 text-sm text-ink-soft">{o.id === 'atlas' ? `Search all ${ATLAS_COUNT} cards and answer the ones you like.` : o.detail}</span>
              <span className="mt-4 text-sm font-semibold text-accent group-hover:text-accent-deep">{starting === o.id ? 'Starting...' : 'Start'}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="cats">
        <h2 id="cats" className="text-[1.05rem] font-semibold">Play one category</h2>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {VELVET_CATS.filter((c) => c.id !== 'vault').map((c) => {
            const n = VELVET.filter((q) => q.cat === c.id).length;
            return (
              <li key={c.id}>
                <button type="button" disabled={starting !== null} onClick={() => start({ style: 'categories', only: c.id, rounds: 12 }, `only:${c.id}`, c.title)} className="flex h-full w-full flex-col rounded-[10px] bg-white p-4 text-left shadow-hairline transition-shadow hover:shadow-lift disabled:opacity-60">
                  <span className="font-semibold">{c.title}</span>
                  <span className="mt-0.5 flex-1 text-sm text-ink-soft">{c.detail}</span>
                  <span className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-ink-mute">{n} questions</span>
                    <span className="font-semibold text-accent">{starting === `only:${c.id}` ? 'Starting...' : 'Play'}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {error && !data ? (
        <p className="mt-10 rounded-[10px] bg-danger-soft px-4 py-3 text-danger">{error.message}</p>
      ) : !data ? (
        <FullPageLoader label="Loading your games" />
      ) : (
        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <section>
            <h2 className="text-[1.05rem] font-semibold">In progress</h2>
            {active.length === 0 ? (
              <p className="mt-3 rounded-[10px] bg-mist px-4 py-6 text-center text-sm text-ink-mute shadow-hairline">Nothing in progress. Pick a way to play above.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line rounded-[10px] bg-white shadow-hairline">
                {active.map((s) => (
                  <li key={s.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{styleOf(s)}</p>
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
            )}
          </section>
          <section>
            <h2 className="text-[1.05rem] font-semibold">Recent games</h2>
            {recent.length === 0 ? (
              <p className="mt-3 rounded-[10px] bg-mist px-4 py-6 text-center text-sm text-ink-mute shadow-hairline">No finished games yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line rounded-[10px] bg-white shadow-hairline">
                {recent.slice(0, 8).map((s) => (
                  <li key={s.id}>
                    <Link to={`/play/${s.id}`} className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-mist sm:px-5">
                      <span className="font-medium">{styleOf(s)}</span>
                      <span className="text-sm text-ink-mute">{shortDate(s.completed_at ?? s.updated_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Shell>
  );
}
