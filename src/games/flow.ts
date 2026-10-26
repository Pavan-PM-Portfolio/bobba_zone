import { useCallback, useEffect, useRef, useState } from 'react';
import { toAppError } from '../lib/errors';
import { useToast } from '../components/ui/Toast';
import type { SessionApi } from './types';
import type { SessionView } from '../lib/types';

/** Step-based progress shared by turn and reveal games. */
export function useStep(view: SessionView, s: SessionApi) {
  const step = Number(view.session.state.step ?? 0);
  const next = useCallback(
    () => s.patch((st) => (Number(st.step ?? 0) === step ? { step: step + 1 } : null)),
    [s, step],
  );
  return { step, next };
}

/** Wrap async actions: one at a time, errors become toasts, never silent. */
export function useBusy() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(
    async (key: string, fn: () => Promise<unknown>) => {
      if (busy) return;
      setBusy(key);
      try {
        await fn();
      } catch (e) {
        const err = toAppError(e);
        if (err.code !== 'already_submitted') toast(err.message, 'error');
      } finally {
        setBusy(null);
      }
    },
    [busy, toast],
  );
  return { busy, run };
}

/** True once, on the render where `revealed` flips from false to true for this key. */
export function useJustRevealed(key: string, revealed: boolean) {
  const prev = useRef<{ key: string; revealed: boolean } | null>(null);
  const [just, setJust] = useState(false);
  useEffect(() => {
    const p = prev.current;
    if (p && p.key === key && !p.revealed && revealed) setJust(true);
    else if (!p || p.key !== key) setJust(false);
    prev.current = { key, revealed };
  }, [key, revealed]);
  return just;
}

/** Local draft that resets when the step changes. */
export function useDraft<T>(key: string, initial: T) {
  const [state, setState] = useState<{ key: string; value: T }>({ key, value: initial });
  const value = state.key === key ? state.value : initial;
  const set = useCallback((v: T) => setState({ key, value: v }), [key]);
  return [value, set] as const;
}
