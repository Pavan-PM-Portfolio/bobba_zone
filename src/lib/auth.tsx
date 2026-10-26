import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthState {
  status: 'loading' | 'signed_in' | 'signed_out';
  user: User | null;
  /** Name from the account (user_metadata.display_name), else the email's first part. */
  accountName: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function nameFor(user: User | null): string {
  if (!user) return '';
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fromMeta = [meta.display_name, meta.full_name, meta.name].find((v) => typeof v === 'string' && v.trim());
  if (typeof fromMeta === 'string') return fromMeta.trim().slice(0, 30);
  const local = (user.email ?? '').split('@')[0] ?? '';
  return local ? local.charAt(0).toUpperCase() + local.slice(1, 30) : '';
}

export class SignInError extends Error {}

function friendlyAuthError(raw: string, status?: number): string {
  if (/invalid login credentials/i.test(raw)) return "That email and password don't match an account.";
  if (/email not confirmed/i.test(raw)) return 'This account still needs to be confirmed. Ask the person who set it up.';
  if (status === 429 || /rate limit|too many/i.test(raw)) return 'Too many attempts. Wait a minute, then try again.';
  if (/invalid api key|no api key/i.test(raw) || status === 401)
    return "The app can't reach its server right now (configuration). Try again later.";
  if (/fetch|network/i.test(raw)) return "You seem to be offline. Check your connection and try again.";
  return 'Sign-in failed. Please try again.';
}

/**
 * Players sign in with accounts created by the admin in Supabase
 * (Authentication > Users). The session persists in this browser, so a
 * refresh reconnects to the same player seat.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthState['status']>('loading');

  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;
    let cancelled = false;

    sb.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const u = data.session?.user ?? null;
      // Sessions left over from the old guest mode are not valid any more.
      if (u?.is_anonymous) {
        void sb.auth.signOut();
        setUser(null);
        setStatus('signed_out');
        return;
      }
      setUser(u);
      setStatus(u ? 'signed_in' : 'signed_out');
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) sb.realtime.setAuth(session.access_token);
      if (cancelled) return;
      const u = session?.user && !session.user.is_anonymous ? session.user : null;
      setUser(u);
      setStatus(u ? 'signed_in' : 'signed_out');
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthState = {
    status,
    user,
    accountName: nameFor(user),
    async signIn(email, password) {
      if (!supabase) throw new SignInError('Not configured');
      let res;
      try {
        res = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      } catch (e) {
        throw new SignInError(friendlyAuthError(String((e as Error)?.message ?? e)));
      }
      if (res.error) throw new SignInError(friendlyAuthError(res.error.message, res.error.status));
    },
    async signOut() {
      await supabase?.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Like useAuth, but returns null outside the provider (e.g. the setup screen). */
export function useOptionalAuth(): AuthState | null {
  return useContext(AuthContext);
}
