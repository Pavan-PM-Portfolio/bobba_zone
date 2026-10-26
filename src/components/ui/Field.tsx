import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | null;
  trailing?: ReactNode;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, trailing, className = '', ...rest },
  ref,
) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint ? hintId : '', error ? errId : ''].filter(Boolean).join(' ') || undefined}
          className={`h-10 w-full rounded-[6px] bg-white px-3.5 text-[0.98rem] text-ink outline-none transition-shadow placeholder:text-ink-mute/70 ${
            trailing ? 'pr-11' : ''
          } ${
            error
              ? 'shadow-[0_0_0_1px_var(--color-danger)] focus:shadow-[0_0_0_1px_var(--color-danger),0_0_0_3px_rgb(184_50_79/0.15)]'
              : 'shadow-[0_0_0_1px_var(--color-line-strong),0_1px_1px_rgb(36_33_42/0.03)] focus:shadow-[0_0_0_1px_var(--color-accent),0_0_0_3px_rgb(201_79_120/0.16)]'
          }`}
          {...rest}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-ink-mute">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
