import { useState } from 'react';
import { Check, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { entriesFor } from '../../hooks/useSession';
import { useBusy } from '../flow';
import { DESIRE_CATS, LADDER, catTitle, type DesireCat } from './content/desire/types';
import type { Setup, Terms } from './content/taxonomy';
import type { SetupFormProps } from './Setup';

const ALL = DESIRE_CATS.map((c) => c.id);
const STATEMENTS = [
  { key: 'adult', label: 'I am 18 or older, and I am playing with my consenting adult partner.' },
  { key: 'consent', label: 'I want to play. I can skip anything, keep any answer private, pause or stop at any time.' },
  { key: 'understand', label: 'I understand that sharing an interest or curiosity is not agreeing to do anything. Real-world choices are made together, separately from this game.' },
] as const;

/**
 * Private category opt-in for Desire Mode. Stored as priv:setup, which the
 * server never shows the partner; after_dark_terms() returns only the overlap.
 */
export function DesireSetupForm({ view, s, onDone, submitLabel = 'Save my choices' }: SetupFormProps) {
  const { busy, run } = useBusy();
  const mine = entriesFor<Setup & { understand?: boolean }>(view, 'priv:setup')[view.me.player_number]?.payload;
  const previous = ((mine?.include ?? []) as string[]).filter((c): c is DesireCat => ALL.includes(c as DesireCat));
  const [checks, setChecks] = useState({ adult: mine?.adult ?? false, consent: mine?.consent ?? false, understand: mine?.understand ?? false });
  const [include, setInclude] = useState<DesireCat[]>(previous.length ? previous : ['turnons', 'lead', 'touch', 'sensory']);
  const valid = checks.adult && checks.consent && checks.understand && include.length > 0;
  const toggle = (c: DesireCat) => setInclude((xs) => (xs.includes(c) ? xs.filter((x) => x !== c) : [...xs, c]));

  return (
    <div className="space-y-7">
      <p className="flex items-start gap-2.5 rounded-[10px] bg-shell px-4 py-3.5 text-[0.95rem] text-ink">
        <LockKeyhole className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
        Your choices are private. Your partner only ever sees the topics you both chose, never what you left out.
      </p>

      <fieldset className="space-y-2.5">
        <legend className="mb-2 text-sm font-medium">Before you play</legend>
        {STATEMENTS.map((x) => {
          const v = checks[x.key];
          return (
            <label key={x.key} className="flex cursor-pointer items-start gap-3 rounded-[10px] bg-white px-4 py-3.5 shadow-hairline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
              <input type="checkbox" checked={v} onChange={(e) => setChecks({ ...checks, [x.key]: e.target.checked })} className="sr-only" />
              <span className={`mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-[4px] ${v ? 'bg-accent text-white' : 'shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]'}`} aria-hidden="true">
                {v && <Check className="size-3" strokeWidth={3.5} />}
              </span>
              <span>{x.label}</span>
            </label>
          );
        })}
      </fieldset>

      <fieldset>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <legend className="text-sm font-medium">Topics I am open to</legend>
          <button type="button" onClick={() => setInclude(include.length === ALL.length ? [] : ALL)} className="text-sm font-medium text-accent hover:text-accent-deep">
            {include.length === ALL.length ? 'Clear all' : 'Select all'}
          </button>
        </div>
        <div className="space-y-4">
          {LADDER.map((stage) => (
            <div key={stage.n}>
              <p className="mb-1.5 text-xs font-medium tracking-wide text-ink-mute uppercase">
                Step {stage.n}: {stage.title}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {stage.cats.map((id) => {
                  const c = DESIRE_CATS.find((x) => x.id === id)!;
                  const on = include.includes(id);
                  return (
                    <label key={id} className={`flex cursor-pointer items-start gap-3 rounded-[6px] px-3.5 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${on ? 'bg-white shadow-[0_0_0_1px_var(--color-line-strong)]' : 'bg-mist text-ink-mute'}`}>
                      <input type="checkbox" checked={on} onChange={() => toggle(id)} className="sr-only" />
                      <span className={`mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-[4px] ${on ? 'bg-accent text-white' : 'shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]'}`} aria-hidden="true">
                        {on && <Check className="size-3" strokeWidth={3.5} />}
                      </span>
                      <span>
                        <span className={`block text-sm font-medium ${on ? 'text-ink' : ''}`}>{c.title}</span>
                        <span className="block text-xs">{on ? c.detail : 'Not included'}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-ink-mute">Only topics you both choose are used. You can change this at any time during the game.</p>
      </fieldset>

      <Button
        size="lg"
        block
        disabled={!valid}
        loading={busy === 'save'}
        onClick={() =>
          run('save', async () => {
            await s.submit('priv:setup', { adult: checks.adult, consent: checks.consent && checks.understand, understand: checks.understand, level: 5, include, type: 'questions' });
            onDone?.();
          })
        }
      >
        {submitLabel}
      </Button>
      {!valid && <p className="text-center text-sm text-ink-mute">Confirm all three statements and choose at least one topic.</p>}
    </div>
  );
}

export function DesireTermsSummary({ terms }: { terms: Terms }) {
  const cats = (terms.categories ?? []) as string[];
  return (
    <div className="rounded-[10px] bg-white p-5 shadow-hairline">
      <p className="flex items-center gap-2 font-medium">
        <ShieldCheck className="size-4 text-success" aria-hidden="true" /> Topics you both opted into
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {cats.map((c) => (
          <li key={c} className="rounded-[4px] bg-shell px-2 py-1 text-sm font-medium text-accent-deep">
            {catTitle(c as DesireCat)}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-ink-soft">Anything either of you left out will never appear.</p>
    </div>
  );
}
