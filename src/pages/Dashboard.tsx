import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, Clock3, Trash2 } from 'lucide-react';
import { Shell } from '../components/ui/Shell';
import { Button, buttonClass } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { FullPageLoader } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import { GAMES, GameGlyph, gameById, type GameDef } from '../games/registry';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toAppError, type AppError } from '../lib/errors';
import { greeting, relativeTime, shortDate } from '../lib/time';
import type { Dashboard as DashboardData, Moment } from '../lib/types';

interface Item {
  key: string;
  game: GameDef;
  title: string;
  status: string;
  when: string;
  href: string;
  partner?: string;
  detail?: string;
}

function toItems(d: DashboardData): { active: Item[]; recent: Item[] } {
  const items: Item[] = [];
  for (const s of d.sessions) {
    const g = gameById(s.game)!;
    const partner = s.players?.find((p) => p.player_number !== s.my_seat)?.display_name;
    items.push({
      key: `s${s.id}`,
      game: g,
      title: s.title || g.title,
      status: s.status,
      when: s.completed_at ?? s.updated_at,
      href: `/play/${s.id}`,
      partner,
      detail: s.status === 'waiting' ? ((s.players?.length ?? 0) < 2 ? `Waiting for your partner to join, code ${s.invite_code}` : 'In the lobby') : undefined,
    });
  }
  const likely = gameById('likely')!;
  for (const r of d.rooms) {
    items.push({
      key: `r${r.id}`,
      game: likely,
      title: r.title || likely.title,
      status: r.status,
      when: r.completed_at ?? r.created_at,
      href: r.status === 'completed' ? `/history/${r.id}` : `/room/${r.id}`,
      partner: r.players?.find((p) => p.player_number !== r.my_seat)?.display_name,
      detail:
        r.status === 'completed' && r.agreement !== null
          ? `${Math.round(Number(r.agreement))}% agreement`
          : r.status === 'in_progress'
            ? `Question ${r.current_index + 1} of ${r.question_count}`
            : (r.players?.length ?? 0) < 2
              ? `Waiting for your partner to join, code ${r.invite_code}`
              : 'In the lobby',
    });
  }
  items.sort((a, b) => b.when.localeCompare(a.when));
  return {
    active: items.filter((i) => i.status === 'waiting' || i.status === 'in_progress'),
    recent: items.filter((i) => i.status === 'completed'),
  };
}

export default function Dashboard() {
  const { accountName } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [deleting, setDeleting] = useState<Moment | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.dashboard().then(setData).catch((e) => setError(toAppError(e)));
  }, []);
  useEffect(load, [load]);

  if (error && !data)
    return (
      <Shell wide>
        <p className="rounded-[10px] bg-danger-soft px-4 py-3 text-danger">{error.message}</p>
        <Button className="mt-4" variant="secondary" onClick={load}>
          Try again
        </Button>
      </Shell>
    );
  if (!data) return <Shell wide><FullPageLoader label="Loading your games" /></Shell>;

  const { active, recent } = toItems(data);
  const stories = data.sessions.filter((s) => s.game === 'story' && s.status === 'completed').length;

  async function removeMoment() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteMoment(deleting.id);
      setDeleting(null);
      load();
    } catch (e) {
      toast(toAppError(e).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell wide>
      {/* Welcome */}
      <section className="flex flex-col gap-6 border-b border-line pb-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-mute">{new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
          <h1 className="mt-1 text-[2rem] leading-tight font-semibold tracking-[-0.03em]">
            {greeting()}
            {accountName ? `, ${accountName}` : ''}
          </h1>
          <p className="mt-1.5 text-ink-soft">{active.length > 0 ? 'Pick up where you left off, or start something new.' : 'What would you like to play together?'}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/join" className={buttonClass('secondary', 'lg')}>
            Join with a code
          </Link>
          <a href="#games" className={buttonClass('primary', 'lg')} onClick={(e) => { e.preventDefault(); document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' }); }}>
            Play a game together
          </a>
        </div>
      </section>

      {/* Continue */}
      {active.length > 0 && (
        <section className="mt-10" aria-labelledby="continue">
          <h2 id="continue" className="text-[1.05rem] font-semibold">Continue playing</h2>
          <ul className="mt-3 divide-y divide-line rounded-[10px] bg-white shadow-hairline">
            {active.map((i) => (
              <li key={i.key} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                <GameGlyph game={i.game} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{i.title}</p>
                  <p className="truncate text-sm text-ink-mute">
                    {i.detail ?? (i.partner ? `With ${i.partner}` : i.game.format)}, {relativeTime(i.when)}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => navigate(i.href)}>
                  Resume
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Games */}
      <section id="games" className="mt-12 scroll-mt-24" aria-labelledby="games-title">
        <div className="flex items-end justify-between">
          <div>
            <h2 id="games-title" className="text-[1.05rem] font-semibold">Play a game together</h2>
            <p className="mt-0.5 text-sm text-ink-mute">Ten games, each played on your own phones at the same time.</p>
          </div>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((g) => (
            <li key={g.id}>
              <Link
                to={g.id === 'likely' ? '/create' : `/new/${g.id}`}
                className="group flex h-full flex-col rounded-[10px] bg-white p-5 shadow-hairline transition-shadow hover:shadow-lift focus-visible:shadow-lift"
              >
                <div className="flex items-start justify-between">
                  <GameGlyph game={g} size="lg" />
                  <span className="rounded-[4px] px-1.5 py-0.5 text-[0.72rem] font-medium" style={{ background: g.tint.bg, color: g.tint.fg }}>
                    {g.format}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold tracking-[-0.01em]">{g.title}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-ink-soft">{g.description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-ink-mute">
                    <Clock3 className="size-3.5" aria-hidden="true" />
                    {g.duration}
                  </span>
                  <span className="font-medium text-accent group-hover:text-accent-deep">Start</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Progress + recent + moments */}
      <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="recent">
          <h2 id="recent" className="text-[1.05rem] font-semibold">Recent games</h2>
          {recent.length === 0 ? (
            <p className="mt-3 rounded-[10px] bg-mist px-4 py-6 text-center text-sm text-ink-mute shadow-hairline">Games you finish together will appear here.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-[10px] bg-white shadow-hairline">
              {recent.slice(0, 8).map((i) => (
                <li key={i.key}>
                  <Link to={i.href} className="flex items-center gap-4 px-4 py-3.5 hover:bg-mist sm:px-5">
                    <GameGlyph game={i.game} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{i.title}</p>
                      <p className="truncate text-sm text-ink-mute">
                        {shortDate(i.when)}
                        {i.detail ? `, ${i.detail}` : ''}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {recent.length > 8 && (
            <Link to="/history" className="mt-3 inline-block text-sm font-medium text-accent hover:text-accent-deep">
              See all past games
            </Link>
          )}
        </section>

        <aside className="space-y-10">
          <section aria-labelledby="progress">
            <h2 id="progress" className="text-[1.05rem] font-semibold">Together so far</h2>
            <dl className="mt-3 grid grid-cols-3 divide-x divide-line rounded-[10px] bg-white shadow-hairline">
              {[
                ['Games', recent.length],
                ['Memories', data.moments.length],
                ['Stories', stories],
              ].map(([l, n]) => (
                <div key={l as string} className="px-4 py-4">
                  <dd className="tabular text-xl font-semibold">{n}</dd>
                  <dt className="text-xs text-ink-mute">{l}</dt>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="moments">
            <h2 id="moments" className="text-[1.05rem] font-semibold">Saved moments</h2>
            {data.moments.length === 0 ? (
              <p className="mt-3 flex gap-2.5 rounded-[10px] bg-mist px-4 py-4 text-sm text-ink-mute shadow-hairline">
                <Bookmark className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                Use "Save to memories" at the end of a game to keep a moment here.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.moments.slice(0, 6).map((m) => {
                  const g = gameById(m.game);
                  return (
                    <li key={m.id} className="group rounded-[10px] bg-white p-4 shadow-hairline">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{m.title}</p>
                          {m.body && <p className="mt-0.5 line-clamp-2 text-sm whitespace-pre-line text-ink-soft">{m.body}</p>}
                          <p className="mt-1.5 text-xs text-ink-mute">
                            {g?.title ?? 'Game'}, {shortDate(m.created_at)}
                          </p>
                        </div>
                        <button type="button" onClick={() => setDeleting(m)} className="text-ink-mute opacity-60 hover:text-danger hover:opacity-100" aria-label={`Delete memory ${m.title}`}>
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this memory?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button variant="danger" loading={busy} onClick={removeMoment}>
              Delete
            </Button>
          </>
        }
      >
        "{deleting?.title}" will be removed for both of you.
      </Dialog>
    </Shell>
  );
}
