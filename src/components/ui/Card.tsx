import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-[28px] bg-white/90 ring-1 ring-line shadow-lift backdrop-blur-sm ${className}`} {...rest} />;
}
