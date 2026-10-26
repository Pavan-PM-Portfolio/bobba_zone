import { Link } from 'react-router-dom';

/** Two facing arcs: the space between them is the point. */
export function LogoMark({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#C94F78" />
      <path d="M11.5 9.5a6.5 6.5 0 1 0 0 13M20.5 9.5a6.5 6.5 0 1 1 0 13" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Between Us, dashboard">
      <LogoMark />
      <span className="text-[1rem] font-semibold tracking-[-0.015em]">Between Us</span>
    </Link>
  );
}
