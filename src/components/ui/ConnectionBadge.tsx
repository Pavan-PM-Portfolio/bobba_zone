import type { Connection } from '../../hooks/useRoom';

const copy: Record<Connection, { label: string; dot: string }> = {
  connecting: { label: 'Connecting', dot: 'bg-ink-mute animate-pulse-soft' },
  live: { label: 'Live', dot: 'bg-success' },
  reconnecting: { label: 'Reconnecting', dot: 'bg-[#c98a1a] animate-pulse-soft' },
  offline: { label: 'Offline', dot: 'bg-danger' },
};

export function ConnectionBadge({ connection }: { connection: Connection }) {
  const c = copy[connection];
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-[4px] px-2.5 text-xs font-medium text-ink-soft shadow-hairline" role="status" aria-live="polite">
      <span className={`size-1.5 rounded-full ${c.dot}`} aria-hidden="true" />
      {c.label}
    </span>
  );
}
