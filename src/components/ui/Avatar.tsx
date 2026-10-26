import { initials } from '../../lib/game';
import type { PlayerNumber } from '../../lib/types';

/** Seat 1 is always rose, seat 2 always violet - consistent everywhere. */
export const seatTone: Record<PlayerNumber, { bg: string; text: string; ring: string; soft: string; dot: string }> = {
  1: { bg: 'bg-blush', text: 'text-rose-deep', ring: 'ring-rose', soft: 'bg-blush-soft', dot: 'bg-rose' },
  2: { bg: 'bg-lavender', text: 'text-lilac-deep', ring: 'ring-lilac', soft: 'bg-lavender-soft', dot: 'bg-lilac' },
};

export function Avatar({
  name,
  seat,
  size = 'md',
  online,
  className = '',
}: {
  name: string | null;
  seat: PlayerNumber;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  online?: boolean;
  className?: string;
}) {
  const dims = {
    xs: 'size-5 text-[0.6rem]',
    sm: 'size-7 text-[0.7rem]',
    md: 'size-10 text-sm',
    lg: 'size-12 text-base',
  }[size];
  const tone = seatTone[seat];
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${className}`}>
      <span
        className={`${dims} grid place-items-center rounded-full font-semibold tracking-tight ${
          name ? `${tone.bg} ${tone.text}` : 'bg-shell text-ink-mute shadow-[inset_0_0_0_1px_var(--color-line-strong)]'
        }`}
        aria-hidden="true"
      >
        {name ? initials(name) : ''}
      </span>
      {online !== undefined && name && (
        <span
          className={`absolute -right-px -bottom-px size-3 rounded-full ring-2 ring-white ${online ? 'bg-success' : 'bg-line-strong'}`}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
