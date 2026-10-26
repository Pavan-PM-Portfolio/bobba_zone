import { useEffect, useRef, type ReactNode } from 'react';

/** Accessible modal built on the native <dialog> element (focus trap + Esc). */
export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[28px] bg-white p-0 text-ink shadow-float backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-6">
        <h2 id="dialog-title" className="font-display text-2xl">
          {title}
        </h2>
        <div className="mt-2 text-ink-soft">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{actions}</div>
      </div>
    </dialog>
  );
}
