import { Link } from 'react-router-dom';

export function LogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#1C2147" />
      <circle cx="25" cy="30" r="12" fill="#F0A6BA" />
      <circle cx="39" cy="30" r="12" fill="#C9BDF2" fillOpacity=".9" />
      <path d="M32 22.5c2.6 2.2 4.3 5 4.3 7.5S34.6 35.3 32 37.5c-2.6-2.2-4.3-5-4.3-7.5s1.7-5.3 4.3-7.5z" fill="#FFFCF8" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5 rounded-xl" aria-label="Who's More Likely, home">
      <LogoMark />
      <span className="font-display text-[1.15rem] leading-none tracking-tight">Who's More Likely?</span>
    </Link>
  );
}
