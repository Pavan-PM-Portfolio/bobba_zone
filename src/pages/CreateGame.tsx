import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Shell } from '../components/ui/Shell';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { OptionGroup, PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api';
import { toAppError } from '../lib/errors';
import { MODES, ROUNDS, questionCount } from '../lib/game';
import { rememberName, rememberedName } from '../lib/prefs';
import { useAuth } from '../lib/auth';
import type { Category, Mode } from '../lib/types';

const rowClass =
  'flex cursor-pointer items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-mist has-[:focus-visible]:bg-mist has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-accent';

export default function CreateGame() {
  const navigate = useNavigate();
  const toast = useToast();
  const { accountName } = useAuth();
  const [name, setName] = useState(() => rememberedName() || accountName);
  const [couple, setCouple] = useState('');
  const [mode, setMode] = useState<Mode>('standard');
  const [rounds, setRounds] = useState<Category[]>(ROUNDS.map((r) => r.id));
  const [nameError, setNameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleRound = (id: Category) => setRounds((rs) => (rs.includes(id) ? rs.filter((r) => r !== id) : [...rs, id]));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n || n.length > 30) {
      setNameError('Enter a name between 1 and 30 characters.');
      return;
    }
    if (rounds.length === 0) return;
    setBusy(true);
    try {
      const res = await api.createRoom({ displayName: n, coupleName: couple.trim(), mode, rounds });
      rememberName(n);
      navigate(`/room/${res.room_id}`, { replace: true });
    } catch (err) {
      toast(toAppError(err).message, 'error');
      setBusy(false);
    }
  }

  const total = questionCount(mode, rounds);

  return (
    <Shell>
      <PageHeader title="Create a game" description="Choose how long to play. You'll get a private link for your partner." />

      <form onSubmit={submit} className="space-y-7" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Your name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
            maxLength={30}
            autoComplete="given-name"
            error={nameError}
          />
          <Field
            label="Game title (optional)"
            value={couple}
            onChange={(e) => setCouple(e.target.value)}
            maxLength={40}
            placeholder="e.g. Sunday night"
          />
        </div>

        <OptionGroup legend="Length">
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <label key={m.id} className={rowClass}>
                <input type="radio" name="mode" value={m.id} checked={active} onChange={() => setMode(m.id)} className="sr-only" />
                <span
                  className={`grid size-4.5 shrink-0 place-items-center rounded-full ${
                    active ? 'bg-accent' : 'shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]'
                  }`}
                  aria-hidden="true"
                >
                  {active && <span className="size-1.5 rounded-full bg-white" />}
                </span>
                <span className="flex-1">
                  <span className="block font-medium">{m.title}</span>
                  <span className="block text-sm text-ink-mute">{m.detail}</span>
                </span>
                <span className="tabular text-sm text-ink-soft">{questionCount(m.id, rounds)} questions</span>
              </label>
            );
          })}
        </OptionGroup>

        <OptionGroup
          legend="Rounds"
          hint={
            rounds.length === 0 && (
              <p className="mt-2 text-sm text-danger" role="alert">
                Choose at least one round.
              </p>
            )
          }
        >
          {ROUNDS.map((r) => {
            const on = rounds.includes(r.id);
            return (
              <label key={r.id} className={rowClass}>
                <input type="checkbox" checked={on} onChange={() => toggleRound(r.id)} className="sr-only" />
                <span
                  className={`grid size-4.5 shrink-0 place-items-center rounded-[4px] ${
                    on ? 'bg-accent text-white' : 'shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]'
                  }`}
                  aria-hidden="true"
                >
                  {on && <Check className="size-3" strokeWidth={3.5} />}
                </span>
                <span className="flex-1">
                  <span className="block font-medium">{r.title}</span>
                  <span className="block text-sm text-ink-mute">{r.blurb}</span>
                </span>
              </label>
            );
          })}
        </OptionGroup>

        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="tabular text-center text-sm text-ink-mute sm:text-left">
            {rounds.length ? `${total} questions` : 'No rounds selected'}
          </p>
          <Button type="submit" size="lg" loading={busy} disabled={rounds.length === 0}>
            Create game
          </Button>
        </div>
      </form>
    </Shell>
  );
}
