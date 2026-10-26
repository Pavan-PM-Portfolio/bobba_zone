import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { buttonClass } from '../../components/ui/Button';
import { SaveMoment } from '../../components/session/Parts';
import type { SessionView } from '../../lib/types';
import { MODES, type ModeId } from './modes';

/** Shared end-of-session layout: stats, mode-specific sections, what to play next. */
export function Recap({
  view,
  mode,
  title,
  stats,
  children,
  momentTitle,
  momentBody,
}: {
  view: SessionView;
  mode: ModeId;
  title: string;
  stats: [string, number | string][];
  children?: ReactNode;
  momentTitle: string;
  momentBody?: string;
}) {
  const idx = MODES.findIndex((m) => m.id === mode);
  const next = MODES[(idx + 1) % MODES.length]!;
  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm font-medium text-accent">Session complete</p>
        <h1 className="mt-1 text-[1.75rem] font-semibold tracking-[-0.025em]">{title}</h1>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([l, n]) => (
          <div key={l} className="rounded-[10px] bg-white p-4 shadow-hairline">
            <dd className="tabular text-2xl font-semibold">{n}</dd>
            <dt className="text-sm text-ink-soft">{l}</dt>
          </div>
        ))}
      </dl>
      {children}
      <div className="flex flex-col gap-4 rounded-[12px] bg-shell p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-ink-soft">Try next</p>
          <p className="font-semibold">{next.title}</p>
          <p className="text-sm text-ink-soft">{next.description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <SaveMoment game="after_dark" sessionId={view.session.id} defaultTitle={momentTitle} defaultBody={momentBody} />
          <Link to="/after-dark" className={buttonClass('primary', 'sm')}>
            Back to After Dark
          </Link>
        </div>
      </div>
    </div>
  );
}

export function RecapList({ title, items }: { title: string; items: ReactNode[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="mb-3 text-[1.05rem] font-semibold">{title}</h2>
      <ul className="divide-y divide-line rounded-[10px] bg-white shadow-hairline">
        {items.map((it, i) => (
          <li key={i} className="px-4 py-3.5 sm:px-5">
            {it}
          </li>
        ))}
      </ul>
    </section>
  );
}
