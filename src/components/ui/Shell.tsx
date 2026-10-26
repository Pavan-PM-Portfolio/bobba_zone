import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { History, LogOut } from 'lucide-react';
import { Logo } from './Logo';
import { useOptionalAuth } from '../../lib/auth';
import { initials } from '../../lib/game';

function AccountButton() {
  const auth = useOptionalAuth();
  if (!auth) return null;
  const { status, accountName, user, signOut } = auth;
  if (status === 'loading') return null;
  if (status !== 'signed_in') {
    return (
      <Link
        to="/login"
        className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-paper hover:bg-[#2a3060]"
      >
        Sign in
      </Link>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white py-1 pr-1 pl-1 ring-1 ring-line">
      <span
        className="grid size-8 place-items-center rounded-full bg-lavender font-display text-sm text-lilac-deep"
        title={user?.email ?? undefined}
        aria-hidden="true"
      >
        {initials(accountName || '?')}
      </span>
      <span className="hidden max-w-[9rem] truncate px-1.5 text-sm font-semibold sm:inline">{accountName}</span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="grid size-8 place-items-center rounded-full text-ink-mute hover:bg-ink/5 hover:text-ink"
        aria-label={`Sign out${user?.email ? ` (${user.email})` : ''}`}
        title="Sign out"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </button>
    </span>
  );
}

export function Shell({ children, aside, wide }: { children: ReactNode; aside?: ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          {aside ?? (
            <Link
              to="/history"
              className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-ink-soft hover:bg-ink/5 hover:text-ink"
              aria-label="Past games"
            >
              <History className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Past games</span>
            </Link>
          )}
          <AccountButton />
        </div>
      </header>
      <main id="main" className={`mx-auto w-full flex-1 px-4 pt-4 pb-16 sm:px-6 ${wide ? 'max-w-5xl' : 'max-w-xl'}`}>
        {children}
      </main>
    </div>
  );
}
