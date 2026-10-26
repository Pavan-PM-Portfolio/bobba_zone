import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: Tone;
  message: string;
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (message: string, tone: Tone = 'info') => {
      const id = nextId.current++;
      setItems((xs) => [...xs.filter((t) => t.message !== message), { id, tone, message }].slice(-3));
      setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500);
    },
    [dismiss],
  );

  const Icon = { success: CircleCheck, error: CircleAlert, info: Info };

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        aria-live="polite"
        role="region"
        aria-label="Notifications"
      >
        {items.map((t) => {
          const I = Icon[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full max-w-md animate-rise items-start gap-3 rounded-2xl bg-ink px-4 py-3 text-[0.95rem] text-paper shadow-float"
            >
              <I
                className={`mt-0.5 size-5 shrink-0 ${t.tone === 'error' ? 'text-blush' : t.tone === 'success' ? 'text-[#9fe0c0]' : 'text-lavender'}`}
                aria-hidden="true"
              />
              <p className="flex-1">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="rounded-full p-0.5 text-paper/70 hover:text-paper" aria-label="Dismiss">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
