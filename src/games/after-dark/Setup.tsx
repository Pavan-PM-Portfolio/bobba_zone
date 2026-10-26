import { useState } from 'react';
import { Check, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Note, Waiting } from '../../components/session/Parts';
import { entriesFor, seatNames } from '../../hooks/useSession';
import type { PlayerNumber } from '../../lib/types';
import { useBusy } from '../flow';
import type { GameProps } from '../types';
import { CATEGORIES, LEVELS, categoryTitle, levelTitle, type Category, type ContentType, type Setup, type Terms } from './content/taxonomy';
import { loadDefaults, saveDefaults } from './prefs';

const TYPES: { id: ContentType; title: string; detail: string }[] = [
  { id: 'mix', title: 'A mix', detail: 'Questions and challenges' },
  { id: 'questions', title: 'Questions only', detail: 'Talking, no challenges' },
  { id: 'challenges', title: 'Challenges only', detail: 'Doing, not answering' },
];

/** The private boundaries form. Stored as priv:setup: never visible to the partner. */
export function SetupForm({ view, s, onDone, submitLabel = 'Save my choices' }: GameProps & { onDone?: () => void; submitLabel?: string }) {
  const { busy, run } = useBusy();
  const mine = entriesFor<Setup>(view, 'priv:setup')[view.me.player_number]?.payload;
  const d = loadDefaults();
  const [adult, setAdult] = useState(mine?.adult ?? false);
  const [consent, setConsent] = useState(mine?.consent ?? false);
  const [level, setLevel] = useState<number>(mine?.level ?? d.level);
  const [include, setInclude] = useState<Category[]>(mine?.include ?? d.include);
  const [type, setType] = useState<ContentType>(mine?.type ?? d.type);
  const valid = adult && consent && include.length > 0;
  const toggle = (c: Category) => setInclude((xs) => (xs.includes(c) ? xs.filter((x) => x !== c) : [...xs, c]));

  return (
    <div className="space-y-7">
      <p className="flex items-start gap-2.5 rounded-[10px] bg-shell px-4 py-3.5 text-[0.95rem] text-ink">
        <LockKeyhole className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
        Your choices here are private. Your partner never sees them, only what you both agreed to.
      </p>

      <fieldset className="space-y-2.5">
        <legend className="mb-2 text-sm font-medium">Before you play</legend>
        {[
          { v: adult, set: setAdult, label: 'I am 18 or older.' },
          { v: consent, set: setConsent, label: 'I want to play, and I know I can skip anything, lower the intensity or stop at any time.' },
        ].map((x) => (
          <label key={x.label} className="flex cursor-pointer items-start gap-3 rounded-[10px] bg-white px-4 py-3.5 shadow-hairline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
            <input type="checkbox" checked={x.v} onChange={(e) => x.set(e.target.checked)} className="sr-only" />
            <span className={`mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-[4px] ${x.v ? 'bg-accent text-white' : 'shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]'}`} aria-hidden="true">
              {x.v && <Check className="size-3" strokeWidth={3.5} />}
            </span>
            <span>{x.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Highest intensity you are comfortable with</legend>
        <div className="grid gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Intensity">
          {LEVELS.map((l) => (
            <button
              key={l.n}
              type="button"
              role="radio"
              aria-checked={level === l.n}
              onClick={() => setLevel(l.n)}
              className={`rounded-[6px] px-3 py-2.5 text-left transition-colors ${
                level === l.n ? 'bg-shell shadow-[0_0_0_1.5px_var(--color-accent)]' : 'bg-white shadow-[0_0_0_1px_var(--color-line-strong)] hover:bg-mist'
              }`}
            >
              <span className="tabular block text-xs text-ink-mute">Level {l.n}</span>
              <span className={`block text-sm font-medium ${level === l.n ? 'text-accent-deep' : ''}`}>{l.title}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-ink-mute">{LEVELS.find((l) => l.n === level)?.detail} The game uses the lower of your two levels.</p>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Categories to include</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const on = include.includes(c.id);
            return (
              <label key={c.id} className={`flex cursor-pointer items-start gap-3 rounded-[6px] px-3.5 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${on ? 'bg-white shadow-[0_0_0_1px_var(--color-line-strong)]' : 'bg-mist text-ink-mute'}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(c.id)} className="sr-only" />
                <span className={`mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-[4px] ${on ? 'bg-accent text-white' : 'shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]'}`} aria-hidden="true">
                  {on && <Check className="size-3" strokeWidth={3.5} />}
                </span>
                <span>
                  <span className={`block text-sm font-medium ${on ? 'text-ink' : ''}`}>{c.title}</span>
                  <span className="block text-xs">{on ? c.detail : 'Excluded'}</span>
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-sm text-ink-mute">Only categories you both include are used. Anything you leave out is never shown.</p>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">What kind of prompts?</legend>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Prompt type">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={type === t.id}
              onClick={() => setType(t.id)}
              className={`rounded-[6px] px-3 py-2.5 text-left ${type === t.id ? 'bg-shell shadow-[0_0_0_1.5px_var(--color-accent)]' : 'bg-white shadow-[0_0_0_1px_var(--color-line-strong)] hover:bg-mist'}`}
            >
              <span className={`block text-sm font-medium ${type === t.id ? 'text-accent-deep' : ''}`}>{t.title}</span>
              <span className="block text-xs text-ink-mute">{t.detail}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <Button
        size="lg"
        block
        disabled={!valid}
        loading={busy === 'save'}
        onClick={() =>
          run('save', async () => {
            await s.submit('priv:setup', { adult, consent, level, include, type });
            saveDefaults({ level, include, type });
            onDone?.();
          })
        }
      >
        {submitLabel}
      </Button>
      {!valid && <p className="text-center text-sm text-ink-mute">Confirm both statements and include at least one category.</p>}
    </div>
  );
}

export function TermsSummary({ terms }: { terms: Terms }) {
  return (
    <div className="rounded-[10px] bg-white p-5 shadow-hairline">
      <p className="flex items-center gap-2 font-medium">
        <ShieldCheck className="size-4 text-success" aria-hidden="true" /> What you both agreed to
      </p>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-ink-mute">Intensity</dt>
          <dd className="font-medium">
            Level {terms.level}, {levelTitle(terms.level ?? 1)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-mute">Prompts</dt>
          <dd className="font-medium">{terms.type === 'mix' ? 'Questions and challenges' : terms.type === 'questions' ? 'Questions only' : 'Challenges only'}</dd>
        </div>
        <div className="sm:col-span-3">
          <dt className="text-ink-mute">Categories</dt>
          <dd className="font-medium">{terms.categories?.map(categoryTitle).join(', ')}</dd>
        </div>
      </dl>
      {terms.type_conflict && <p className="mt-3 text-sm text-ink-soft">You chose different prompt types, so the gentler option, questions only, is used.</p>}
    </div>
  );
}

/** Pre-game: both confirm privately; the game starts only on shared terms. */
export function SetupPhase({ view, s, terms, onStart }: GameProps & { terms: Terms | null; onStart: () => Promise<unknown> }) {
  const { busy, run } = useBusy();
  const [editing, setEditing] = useState(false);
  const names = seatNames(view);
  const partner: PlayerNumber = view.me.player_number === 1 ? 2 : 1;
  const mine = entriesFor<Setup>(view, 'priv:setup')[view.me.player_number];

  if (!mine || editing || (terms && !terms.me_ready)) {
    return (
      <div>
        <h1 className="text-[1.6rem] font-semibold tracking-[-0.02em]">Set your boundaries</h1>
        <p className="mt-1.5 text-ink-soft">Each of you chooses privately. The game only uses what you both say yes to.</p>
        <div className="mt-7">
          <SetupForm view={view} s={s} onDone={() => setEditing(false)} submitLabel={mine ? 'Update my choices' : "I'm ready"} />
        </div>
      </div>
    );
  }
  if (!terms) return <Waiting>Checking what you both agreed to.</Waiting>;

  return (
    <div className="space-y-5">
      <h1 className="text-[1.6rem] font-semibold tracking-[-0.02em]">Ready when you are</h1>
      {!terms.partner_ready ? (
        <Waiting>Your choices are saved. Waiting for {names[partner]} to set theirs.</Waiting>
      ) : !terms.agreed ? (
        <Note tone="pink">
          You haven't picked any categories in common yet. Each of you can change your choices; nothing you didn't both choose will be used.
        </Note>
      ) : (
        <>
          <TermsSummary terms={terms} />
          <Button size="lg" block loading={busy === 'go'} onClick={() => run('go', onStart)}>
            Start playing
          </Button>
        </>
      )}
      <Button variant="ghost" onClick={() => setEditing(true)}>
        Change my choices
      </Button>
    </div>
  );
}
