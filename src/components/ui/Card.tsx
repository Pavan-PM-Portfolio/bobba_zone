import type { HTMLAttributes } from 'react';

/** Surfaces: `flat` sits on the page with a hairline; `raised` floats above it. */
export function Card({ className = '', raised, ...rest }: HTMLAttributes<HTMLDivElement> & { raised?: boolean }) {
  return (
    <div
      className={`rounded-[10px] bg-white ${raised ? 'shadow-float' : 'shadow-hairline'} ${className}`}
      {...rest}
    />
  );
}
