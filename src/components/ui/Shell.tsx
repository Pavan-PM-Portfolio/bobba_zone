import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import { Logo } from './Logo';

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
              className="inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold text-ink-soft hover:bg-ink/5 hover:text-ink"
            >
              <History className="size-4" aria-hidden="true" />
              Past games
            </Link>
          )}
        </div>
      </header>
      <main id="main" className={`mx-auto w-full flex-1 px-4 pt-4 pb-16 sm:px-6 ${wide ? 'max-w-5xl' : 'max-w-xl'}`}>
        {children}
      </main>
    </div>
  );
}
