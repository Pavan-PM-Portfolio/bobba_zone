import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Logo } from './Logo';
import { useOptionalAuth } from '../../lib/auth';
import { initials } from '../../lib/game';

function AccountMenu() {
  const auth = useOptionalAuth();
  if (!auth || auth.status === 'loading') return null;
  const { status, accountName, user, signOut } = auth;
  if (status !== 'signed_in') {
    return (
      <Link to="/login" className="inline-flex h-9 items-center rounded-[6px] px-3 text-sm font-semibold text-ink hover:bg-mist">
        Sign in
      </Link>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <span className="flex items-center gap-2 pl-1" title={user?.email ?? undefined}>
        <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-[0.7rem] font-semibold text-accent-deep" aria-hidden="true">
          {initials(accountName || '?')}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:inline">{accountName}</span>
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="grid size-9 place-items-center rounded-[6px] text-ink-mute hover:bg-mist hover:text-ink"
        aria-label={`Sign out${user?.email ? ` (${user.email})` : ''}`}
        title="Sign out"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </button>
    </span>
  );
}

export function Shell({
  children,
  aside,
  wide,
  bare,
  backdrop,
}: {
  children: ReactNode;
  /** Decorative layer rendered behind the header and page (e.g. the aurora). */
  backdrop?: ReactNode;
  aside?: ReactNode;
  wide?: boolean;
  /** No bottom border on the header (used over the aurora). */
  bare?: boolean;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      {backdrop}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[6px] focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <header className={`relative z-10 ${bare ? '' : 'border-b border-line bg-white'}`}>
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)] sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1" aria-label="Account">
            {aside}
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `hidden h-9 items-center rounded-[6px] px-3 text-sm font-medium sm:inline-flex ${
                  isActive ? 'text-ink' : 'text-ink-soft hover:bg-mist hover:text-ink'
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `hidden h-9 items-center rounded-[6px] px-3 text-sm font-medium sm:inline-flex ${
                  isActive ? 'text-ink' : 'text-ink-soft hover:bg-mist hover:text-ink'
                }`
              }
            >
              Past games
            </NavLink>
            <AccountMenu />
          </nav>
        </div>
      </header>
      <main id="main" className={`relative z-10 mx-auto w-full flex-1 px-4 pt-8 pb-20 sm:px-6 sm:pt-12 ${wide ? 'max-w-6xl' : 'max-w-[34rem]'}`}>
        {children}
      </main>
    </div>
  );
}
