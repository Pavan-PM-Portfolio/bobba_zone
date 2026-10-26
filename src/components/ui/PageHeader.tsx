import type { ReactNode } from 'react';

export function PageHeader({ title, description, children }: { title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-[1.9rem] leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-[2.15rem]">{title}</h1>
      {description && <p className="mt-2 text-[1.02rem] leading-relaxed text-ink-soft">{description}</p>}
      {children}
    </div>
  );
}

/** A grouped list of options: one hairline container, rows divided by rules. */
export function OptionGroup({ legend, children, hint }: { legend: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="divide-y divide-line overflow-hidden rounded-[10px] bg-white shadow-[0_0_0_1px_var(--color-line-strong)]">
        {children}
      </div>
      {hint}
    </fieldset>
  );
}
