import type { Connection } from '../../hooks/useRoom';

const copy: Record<Connection, { label: string; dot: string }> = {
  connecting: { label: 'Connecting', dot: 'bg-ink-mute/50 animate-pulse' },
  live: { label: 'Live', dot: 'bg-success' },
  reconnecting: { label: 'Reconnecting', dot: 'bg-[#d8a23a] animate-pulse' },
  offline: { label: 'Offline', dot: 'bg-danger' },
};

export function ConnectionBadge({ connection }: { connection: Connection }) {
  const c = copy[connection];
  return (
    <span
      className="inline-flex h-8 items-center gap-2 rounded-full bg-white px-3 text-[0.8rem] font-semibold text-ink-soft ring-1 ring-line"
      role="status"
      aria-live="polite"
    >
      <span className={`size-2 rounded-full ${c.dot}`} aria-hidden="true" />
      {c.label}
    </span>
  );
}
