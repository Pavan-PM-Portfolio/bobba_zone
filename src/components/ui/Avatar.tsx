import { initials } from '../../lib/game';
import type { PlayerNumber } from '../../lib/types';

/** Player 1 is always rose, player 2 always lavender - consistent everywhere. */
export const seatTone: Record<PlayerNumber, { bg: string; text: string; ring: string; soft: string }> = {
  1: { bg: 'bg-blush', text: 'text-rose-deep', ring: 'ring-rose', soft: 'bg-blush-soft' },
  2: { bg: 'bg-lavender', text: 'text-lilac-deep', ring: 'ring-lilac', soft: 'bg-lavender-soft' },
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
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
  className?: string;
}) {
  const dims = size === 'lg' ? 'size-18 text-2xl' : size === 'sm' ? 'size-8 text-xs' : 'size-12 text-base';
  const tone = seatTone[seat];
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${className}`}>
      <span
        className={`${dims} grid place-items-center rounded-full font-display ${
          name ? `${tone.bg} ${tone.text}` : 'border-2 border-dashed border-line bg-white text-ink-mute'
        }`}
        aria-hidden="true"
      >
        {name ? initials(name) : '?'}
      </span>
      {online !== undefined && name && (
        <span
          className={`absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full ring-2 ring-white ${online ? 'bg-success' : 'bg-ink-mute/40'}`}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
