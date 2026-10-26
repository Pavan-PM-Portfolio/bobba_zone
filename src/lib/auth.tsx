import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

interface AuthState {
  status: 'loading' | 'ready' | 'error';
  userId: string | null;
  error: string | null;
  retry: () => void;
}

const AuthContext = createContext<AuthState>({ status: 'loading', userId: null, error: null, retry: () => {} });

/**
 * Every visitor gets a Supabase anonymous identity (a real auth user with a
 * JWT). It is persisted in the browser, so refreshing or reopening the tab
 * reconnects to the same player seat.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, 'retry'>>({ status: 'loading', userId: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    const sb = supabase;

    (async () => {
      try {
        const { data } = await sb.auth.getSession();
        let session = data.session;
        if (!session) {
          const res = await sb.auth.signInAnonymously();
          if (res.error) throw res.error;
          session = res.data.session;
        }
        if (!cancelled) setState({ status: 'ready', userId: session?.user.id ?? null, error: null });
      } catch (e) {
        const msg = (e as Error)?.message ?? '';
        if (!cancelled)
          setState({
            status: 'error',
            userId: null,
            error: /anonymous/i.test(msg)
              ? 'Guest sign-in is turned off for this project. Enable anonymous sign-ins in Supabase Auth settings.'
              : "We couldn't start your session. Check your connection and try again.",
          });
      }
    })();

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) sb.realtime.setAuth(session.access_token);
      if (!cancelled && session) setState({ status: 'ready', userId: session.user.id, error: null });
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [attempt]);

  return (
    <AuthContext.Provider value={{ ...state, retry: () => setAttempt((n) => n + 1) }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
