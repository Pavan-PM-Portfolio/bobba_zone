import { useState, type FormEvent, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Shell } from '../components/ui/Shell';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { OptionGroup } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import { GameGlyph, gameById } from '../games/registry';
import { KNOW_LENGTHS } from '../games/know-me/content';
import { STORY_CHAPTERS } from '../games/love-story/content';
import { FUTURE_AREAS } from '../games/future/content';
import { CASES } from '../games/mystery/content';
import { THEMES } from '../games/story/content';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toAppError } from '../lib/errors';
import { rememberName, rememberedName } from '../lib/prefs';
import type { SessionGame } from '../lib/types';

const rowClass =
  'flex cursor-pointer items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-mist has-[:focus-visible]:bg-mist has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-accent';

function Radio<T extends string | number>({ name, options, value, onChange }: { name: string; options: { id: T; title: string; detail?: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <label key={String(o.id)} className={rowClass}>
            <input type="radio" name={name} checked={on} onChange={() => onChange(o.id)} className="sr-only" />
            <span className={`grid size-4.5 shrink-0 place-items-center rounded-full ${on ? 'bg-accent' : 'shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]'}`} aria-hidden="true">
              {on && <span className="size-1.5 rounded-full bg-white" />}
            </span>
            <span className="flex-1">
              <span className="block font-medium">{o.title}</span>
              {o.detail && <span className="block text-sm text-ink-mute">{o.detail}</span>}
            </span>
          </label>
        );
      })}
    </>
  );
}

function Checks({ options, value, onChange }: { options: { id: string; title: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <>
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <label key={o.id} className={rowClass}>
            <input type="checkbox" checked={on} onChange={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])} className="sr-only" />
            <span className={`grid size-4.5 shrink-0 place-items-center rounded-[4px] ${on ? 'bg-accent text-white' : 'shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]'}`} aria-hidden="true">
              {on && <Check className="size-3" strokeWidth={3.5} />}
            </span>
            <span className="flex-1 font-medium">{o.title}</span>
          </label>
        );
      })}
    </>
  );
}

export default function NewGame() {
  const { game: gameId } = useParams();
  const game = gameById(gameId ?? '');
  const navigate = useNavigate();
  const toast = useToast();
  const { accountName } = useAuth();
  const [name, setName] = useState(() => rememberedName() || accountName);
  const [title, setTitle] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [length, setLength] = useState<number>(20);
  const [chapters, setChapters] = useState<string[]>(STORY_CHAPTERS.map((c) => c.id));
  const [areas, setAreas] = useState<string[]>(FUTURE_AREAS.map((a) => a.id));
  const [count, setCount] = useState<number>(gameId === 'conflict' ? 8 : 10);
  const [caseId, setCaseId] = useState<string>(CASES[0].id);
  const [theme, setTheme] = useState<string>(THEMES[0]!.id);

  if (!game) return <Navigate to="/" replace />;
  if (game.id === 'likely') return <Navigate to="/create" replace />;

  const settings: Record<string, unknown> =
    game.id === 'know_me' ? { length }
    : game.id === 'love_story' ? { chapters }
    : game.id === 'future' ? { areas }
    : game.id === 'trust' || game.id === 'conflict' ? { count }
    : game.id === 'mystery' ? { case_id: caseId }
    : game.id === 'story' ? { theme }
    : {};
  const invalid = (game.id === 'love_story' && chapters.length === 0) || (game.id === 'future' && areas.length === 0);

  let options: ReactNode = null;
  if (game.id === 'know_me')
    options = <OptionGroup legend="Length"><Radio name="len" options={KNOW_LENGTHS.map((l) => ({ id: l.id as number, title: l.title, detail: l.detail }))} value={length} onChange={setLength} /></OptionGroup>;
  if (game.id === 'love_story')
    options = <OptionGroup legend="Chapters (3 prompts each)"><Checks options={STORY_CHAPTERS} value={chapters} onChange={setChapters} /></OptionGroup>;
  if (game.id === 'future')
    options = <OptionGroup legend="Topics (4 questions each)"><Checks options={FUTURE_AREAS} value={areas} onChange={setAreas} /></OptionGroup>;
  if (game.id === 'trust')
    options = <OptionGroup legend="Scenarios"><Radio name="cnt" options={[{ id: 6, title: '6 scenarios', detail: 'About 20 minutes' }, { id: 10, title: '10 scenarios', detail: 'About 35 minutes' }, { id: 16, title: 'All 16 scenarios', detail: 'About an hour' }]} value={count} onChange={setCount} /></OptionGroup>;
  if (game.id === 'conflict')
    options = <OptionGroup legend="Scenarios"><Radio name="cnt" options={[{ id: 5, title: '5 scenarios', detail: 'About 20 minutes' }, { id: 8, title: '8 scenarios', detail: 'About 35 minutes' }, { id: 14, title: 'All 14 scenarios', detail: 'About an hour' }]} value={count} onChange={setCount} /></OptionGroup>;
  if (game.id === 'mystery')
    options = <OptionGroup legend="Case"><Radio name="case" options={CASES.map((c) => ({ id: c.id as string, title: c.title, detail: c.blurb }))} value={caseId} onChange={setCaseId} /></OptionGroup>;
  if (game.id === 'story')
    options = <OptionGroup legend="Theme"><Radio name="theme" options={THEMES.map((t) => ({ id: t.id as string, title: t.title, detail: t.detail }))} value={theme} onChange={setTheme} /></OptionGroup>;
  if (game.id === 'after_hours')
    options = <p className="rounded-[10px] bg-shell px-4 py-3.5 text-[0.95rem] text-ink">You will each choose a comfort level privately when the game starts. The gentler choice is used.</p>;
  if (game.id === 'quest')
    options = <p className="rounded-[10px] bg-mist px-4 py-3.5 text-[0.95rem] text-ink-soft shadow-hairline">You will set a budget and time once you are both in. The quest stays open for as long as you like.</p>;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n || n.length > 30) {
      setNameError('Enter a name between 1 and 30 characters.');
      return;
    }
    if (invalid) return;
    setBusy(true);
    try {
      const res = await api.createSession(game!.id as SessionGame, n, settings, title.trim() || undefined);
      rememberName(n);
      navigate(`/play/${res.session_id}`, { replace: true });
    } catch (err) {
      toast(toAppError(err).message, 'error');
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="mb-8 flex items-start gap-4">
        <GameGlyph game={game} size="lg" />
        <div>
          <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.025em]">{game.title}</h1>
          <p className="mt-1 text-ink-soft">{game.description}</p>
          <p className="mt-2 text-sm text-ink-mute">
            {game.format}, {game.duration}
          </p>
        </div>
      </div>
      <form onSubmit={submit} noValidate className="space-y-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" value={name} maxLength={30} autoComplete="given-name" error={nameError} onChange={(e) => { setName(e.target.value); setNameError(null); }} />
          <Field label="Title (optional)" value={title} maxLength={60} placeholder="e.g. Sunday night" onChange={(e) => setTitle(e.target.value)} />
        </div>
        {options}
        {invalid && <p className="text-sm text-danger" role="alert">Choose at least one.</p>}
        <div className="flex justify-end border-t border-line pt-6">
          <Button type="submit" size="lg" loading={busy} disabled={invalid}>
            Create game
          </Button>
        </div>
      </form>
    </Shell>
  );
}
