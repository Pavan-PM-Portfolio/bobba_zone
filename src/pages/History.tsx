import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shell } from '../components/ui/Shell';
import { FullPageLoader } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import { toAppError, type AppError } from '../lib/errors';
import type { HistoryItem } from '../lib/types';

const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function History() {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  const load = () => {
    setError(null);
    api.history().then(setItems).catch((e) => setError(toAppError(e)));
  };
  useEffect(load, []);

  return (
    <Shell>
      <h1 className="font-display text-4xl">Past games</h1>
      <p className="mt-2 text-ink-soft">Only the two players of each game can see it. Games are kept for a year.</p>

      <div className="mt-8">
        {error ? (
          <div className="rounded-2xl bg-blush-soft p-5">
            <p className="font-medium text-rose-deep">{error.message}</p>
            <Button variant="secondary" className="mt-3" onClick={load}>
              Try again
            </Button>
          </div>
        ) : !items ? (
          <FullPageLoader label="Loading your games" />
        ) : items.length === 0 ? (
          <div className="rounded-[28px] bg-white p-8 text-center ring-1 ring-line">
            <p className="font-display text-2xl">No finished games yet</p>
            <p className="mt-2 text-ink-soft">Games you finish on this device will appear here.</p>
            <Link to="/create" className="mt-6 inline-flex h-12 items-center rounded-full bg-ink px-7 font-semibold text-paper">
              Create a game
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((h) => {
              const names = h.players.map((p) => p.display_name).join(' & ');
              return (
                <li key={h.room_id}>
                  <Link
                    to={`/history/${h.room_id}`}
                    className="flex items-center gap-4 rounded-[24px] bg-white p-4 ring-1 ring-line transition-shadow hover:shadow-lift sm:p-5"
                  >
                    <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-blush-soft font-display text-2xl text-rose-deep">
                      {Math.round(Number(h.results?.agreement_percentage ?? 0))}%
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{h.couple_name || names}</span>
                      <span className="block text-sm text-ink-mute">
                        {dateFmt.format(new Date(h.completed_at))}, {h.question_count} questions
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Shell>
  );
}
