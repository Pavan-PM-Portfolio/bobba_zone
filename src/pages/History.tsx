import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shell } from '../components/ui/Shell';
import { FullPageLoader } from '../components/ui/Spinner';
import { Button, buttonClass } from '../components/ui/Button';
import { GameGlyph, gameById } from '../games/registry';
import { api } from '../lib/api';
import { toAppError, type AppError } from '../lib/errors';
import { shortDate } from '../lib/time';
import type { Dashboard } from '../lib/types';

export default function History() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const load = () => {
    setError(null);
    api.dashboard().then(setData).catch((e) => setError(toAppError(e)));
  };
  useEffect(load, []);

  const items = data
    ? [
        ...data.sessions
          .filter((s) => s.status === 'completed')
          .map((s) => ({ key: s.id, game: gameById(s.game)!, title: s.title || gameById(s.game)!.title, when: s.completed_at!, href: `/play/${s.id}`, detail: '' })),
        ...data.rooms
          .filter((r) => r.status === 'completed')
          .map((r) => ({
            key: r.id,
            game: gameById('likely')!,
            title: r.title || 'Who Is More Likely To?',
            when: r.completed_at!,
            href: `/history/${r.id}`,
            detail: r.agreement !== null ? `${Math.round(Number(r.agreement))}% agreement` : '',
          })),
      ].sort((a, b) => b.when.localeCompare(a.when))
    : [];

  return (
    <Shell>
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.025em]">Past games</h1>
      <p className="mt-1.5 text-ink-soft">Only the two players of each game can see it. Finished games are kept for a year.</p>
      <div className="mt-8">
        {error ? (
          <div className="rounded-[10px] bg-danger-soft p-4">
            <p className="text-danger">{error.message}</p>
            <Button variant="secondary" className="mt-3" onClick={load}>
              Try again
            </Button>
          </div>
        ) : !data ? (
          <FullPageLoader label="Loading your games" />
        ) : items.length === 0 ? (
          <div className="rounded-[10px] bg-mist px-6 py-10 text-center shadow-hairline">
            <p className="font-medium">No finished games yet</p>
            <p className="mt-1 text-sm text-ink-soft">When you finish a game together, it will be here to look back on.</p>
            <Link to="/" className={buttonClass('primary', 'md', 'mt-5')}>
              Choose a game
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-line rounded-[10px] bg-white shadow-hairline">
            {items.map((i) => (
              <li key={i.key}>
                <Link to={i.href} className="flex items-center gap-4 px-4 py-3.5 hover:bg-mist sm:px-5">
                  <GameGlyph game={i.game} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{i.title}</span>
                    <span className="block text-sm text-ink-mute">
                      {shortDate(i.when)}
                      {i.detail ? `, ${i.detail}` : ''}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}
