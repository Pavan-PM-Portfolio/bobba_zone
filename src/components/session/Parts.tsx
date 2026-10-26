import { useId, useState, type ReactNode } from 'react';
import { Bookmark, Check } from 'lucide-react';
import { Avatar, seatTone } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Field } from '../ui/Field';
import { useToast } from '../ui/Toast';
import { api } from '../../lib/api';
import { toAppError } from '../../lib/errors';
import type { PlayerNumber } from '../../lib/types';

/** Thin progress bar with a label on each side. */
export function StepProgress({ index, total, label }: { index: number; total: number; label?: ReactNode }) {
  const pct = total > 0 ? Math.min(100, ((index + 1) / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate font-medium text-ink-soft">{label}</span>
        <span className="tabular shrink-0 text-ink-mute">
          {Math.min(index + 1, total)} of {total}
        </span>
      </div>
      <div
        className="mt-2.5 h-[3px] overflow-hidden rounded-[2px] bg-line"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={Math.min(index + 1, total)}
      >
        <div className="h-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PromptHeading({ children, eyebrow, id = 'prompt' }: { children: ReactNode; eyebrow?: ReactNode; id?: string }) {
  return (
    <div className="mt-8">
      {eyebrow && <p className="text-sm font-medium text-accent">{eyebrow}</p>}
      <h1 id={id} tabIndex={-1} className="mt-1.5 text-[1.55rem] leading-[1.25] font-semibold tracking-[-0.022em] text-balance outline-none sm:text-[1.9rem]">
        {children}
      </h1>
    </div>
  );
}

/** Neutral waiting line with a soft pulse. */
export function Waiting({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] bg-mist px-4 py-3.5 text-[0.95rem] text-ink-soft shadow-hairline" role="status">
      <span className="size-2 animate-pulse-soft rounded-full bg-accent" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function Note({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'pink' }) {
  return (
    <div className={`rounded-[10px] px-4 py-3.5 text-[0.95rem] ${tone === 'pink' ? 'bg-shell text-ink' : 'bg-mist text-ink-soft shadow-hairline'}`}>
      {children}
    </div>
  );
}

/** Radio-style list of options. */
export function ChoiceList<T extends string>({
  options,
  value,
  onChange,
  disabled,
  label,
}: {
  options: { id: T; label: string; detail?: string }[];
  value: T | null;
  onChange: (v: T) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="divide-y divide-line overflow-hidden rounded-[10px] bg-white shadow-[0_0_0_1px_var(--color-line-strong)]">
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o.id)}
            className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors focus-visible:-outline-offset-2 ${
              on ? 'bg-shell' : 'hover:bg-mist'
            } disabled:cursor-default disabled:hover:bg-white`}
          >
            <span
              className={`mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full ${on ? 'bg-accent' : 'shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]'}`}
              aria-hidden="true"
            >
              {on && <span className="size-1.5 rounded-full bg-white" />}
            </span>
            <span>
              <span className={`block ${on ? 'font-medium text-ink' : 'text-ink'}`}>{o.label}</span>
              {o.detail && <span className="block text-sm text-ink-mute">{o.detail}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function TextAnswer({
  value,
  onChange,
  placeholder,
  max = 500,
  label,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  max?: number;
  label: string;
  rows?: number;
}) {
  const id = useId();
  return (
    <div>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        maxLength={max}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full resize-y rounded-[6px] bg-white px-3.5 py-3 text-[0.98rem] leading-relaxed text-ink shadow-[0_0_0_1px_var(--color-line-strong)] outline-none placeholder:text-ink-mute/70 focus:shadow-[0_0_0_1px_var(--color-accent),0_0_0_3px_rgb(201_79_120/0.16)]"
      />
      <p className="tabular mt-1.5 text-right text-xs text-ink-mute">
        {value.length} / {max}
      </p>
    </div>
  );
}

/** Two answers side by side, labelled by seat, with a reveal animation. */
export function AnswerPair({
  names,
  me,
  render,
  animate,
}: {
  names: Record<PlayerNumber, string>;
  me: PlayerNumber;
  render: (seat: PlayerNumber) => ReactNode;
  animate?: boolean;
}) {
  const order: PlayerNumber[] = me === 1 ? [1, 2] : [2, 1];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {order.map((seat, i) => (
        <div
          key={seat}
          className={`rounded-[10px] bg-white p-4 shadow-hairline ${animate ? 'animate-flip' : ''}`}
          style={animate ? { animationDelay: `${i * 140}ms` } : undefined}
        >
          <div className="flex items-center gap-2">
            <Avatar name={names[seat]} seat={seat} size="xs" />
            <span className={`text-sm font-medium ${seatTone[seat].text}`}>{seat === me ? 'You' : names[seat]}</span>
          </div>
          <div className="mt-2 text-ink">{render(seat)}</div>
        </div>
      ))}
    </div>
  );
}

export function SameDiff({ same, sameText = 'You agreed on this one.', diffText = 'You saw this differently.' }: { same: boolean; sameText?: string; diffText?: string }) {
  return (
    <p className={`flex items-center gap-2 text-sm font-medium ${same ? 'text-success' : 'text-ink-soft'}`}>
      {same && <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />}
      {same ? sameText : diffText}
    </p>
  );
}

/** Save a moment from any game to the shared memories list. */
export function SaveMoment({
  game,
  sessionId,
  roomId,
  defaultTitle,
  defaultBody,
  label = 'Save to memories',
}: {
  game: string;
  sessionId?: string;
  roomId?: string;
  defaultTitle: string;
  defaultBody?: string;
  label?: string;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle.slice(0, 120));
  const [body, setBody] = useState(defaultBody?.slice(0, 2000) ?? '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await api.saveMoment({ game, title, body, sessionId, roomId });
      setSaved(true);
      setOpen(false);
      toast('Saved to your memories.', 'success');
    } catch (e) {
      toast(toAppError(e).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" icon={saved ? <Check className="size-4 text-success" /> : <Bookmark className="size-4" />} onClick={() => setOpen(true)}>
        {saved ? 'Saved' : label}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Save to memories"
        actions={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={busy} disabled={!title.trim()} onClick={save}>
              Save memory
            </Button>
          </>
        }
      >
        <div className="mt-3 space-y-4 text-ink">
          <Field label="Title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
          <div>
            <p className="mb-1.5 text-sm font-medium">Note (optional)</p>
            <TextAnswer label="Note" value={body} onChange={setBody} max={2000} rows={3} />
          </div>
          <p className="text-sm text-ink-mute">Only the two of you can see saved memories.</p>
        </div>
      </Dialog>
    </>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-[1.05rem] font-semibold tracking-[-0.01em]">{children}</h2>
      {aside}
    </div>
  );
}
