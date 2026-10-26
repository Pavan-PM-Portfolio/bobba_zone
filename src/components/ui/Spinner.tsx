export function Spinner({ className = 'size-5', label }: { className?: string; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center gap-2">
      <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label && <span className="text-sm text-ink-soft">{label}</span>}
    </span>
  );
}

export function FullPageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center text-ink-mute">
      <Spinner className="size-7" label={label} />
    </div>
  );
}
