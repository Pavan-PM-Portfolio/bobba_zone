import { forwardRef, useId, type InputHTMLAttributes } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | null;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, hint, error, className = '', ...rest }, ref) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[0.95rem] font-semibold text-ink">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? hintId : '', error ? errId : ''].filter(Boolean).join(' ') || undefined}
        className={`h-13 w-full rounded-2xl bg-white px-4 text-base text-ink ring-1 placeholder:text-ink-mute/70 outline-none transition-shadow focus:ring-2 ${
          error ? 'ring-danger focus:ring-danger' : 'ring-line focus:ring-lilac'
        }`}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-ink-mute">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
