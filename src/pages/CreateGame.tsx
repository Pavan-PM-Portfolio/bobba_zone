import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Shell } from '../components/ui/Shell';
import { Card } from '../components/ui/Card';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api';
import { toAppError } from '../lib/errors';
import { MODES, ROUNDS, questionCount } from '../lib/game';
import { rememberName, rememberedName } from '../lib/prefs';
import type { Category, Mode } from '../lib/types';

export default function CreateGame() {
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState(rememberedName);
  const [couple, setCouple] = useState('');
  const [mode, setMode] = useState<Mode>('standard');
  const [rounds, setRounds] = useState<Category[]>(ROUNDS.map((r) => r.id));
  const [nameError, setNameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleRound = (id: Category) =>
    setRounds((rs) => (rs.includes(id) ? rs.filter((r) => r !== id) : [...rs, id]));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n || n.length > 30) {
      setNameError('Enter a name between 1 and 30 characters.');
      return;
    }
    if (rounds.length === 0) {
      toast('Choose at least one round.', 'error');
      return;
    }
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

  return (
    <Shell>
      <h1 className="font-display text-4xl">Create a game</h1>
      <p className="mt-2 text-ink-soft">You'll get a private link to send your partner.</p>

      <form onSubmit={submit} className="mt-8 space-y-6" noValidate>
        <Card className="space-y-5 p-5 sm:p-6">
          <Field
            label="Your name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
            maxLength={30}
            autoComplete="given-name"
            placeholder="e.g. Shreya"
            error={nameError}
            required
          />
          <Field
            label="Name for the two of you (optional)"
            value={couple}
            onChange={(e) => setCouple(e.target.value)}
            maxLength={40}
            placeholder="e.g. Team Chai"
            hint="Shown at the top of your game."
          />
        </Card>

        <fieldset>
          <legend className="mb-3 text-[0.95rem] font-semibold">Game length</legend>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {MODES.map((m) => {
              const active = mode === m.id;
              return (
                <label
                  key={m.id}
                  className={`relative cursor-pointer rounded-2xl bg-white p-4 ring-1 transition-shadow has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-lilac ${
                    active ? 'ring-2 ring-ink' : 'ring-line hover:ring-ink/30'
                  }`}
                >
                  <input type="radio" name="mode" value={m.id} checked={active} onChange={() => setMode(m.id)} className="sr-only" />
                  <span className="block font-semibold">{m.title}</span>
                  <span className="block text-sm text-ink-mute">
                    {questionCount(m.id, rounds)} questions, {m.detail.toLowerCase()}
                  </span>
                  {active && <Check className="absolute top-3.5 right-3.5 size-4" aria-hidden="true" />}
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-[0.95rem] font-semibold">Rounds</legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {ROUNDS.map((r) => {
              const on = rounds.includes(r.id);
              return (
                <label
                  key={r.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 ring-1 transition-shadow has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-lilac ${
                    on ? 'ring-2 ring-ink' : 'ring-line hover:ring-ink/30'
                  }`}
                >
                  <input type="checkbox" checked={on} onChange={() => toggleRound(r.id)} className="sr-only" />
                  <span
                    className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md ${on ? 'bg-ink text-paper' : 'ring-1 ring-ink-mute/50'}`}
                    aria-hidden="true"
                  >
                    {on && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span>
                    <span className="block font-semibold">{r.title}</span>
                    <span className="block text-sm text-ink-mute">{r.blurb}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {rounds.length === 0 && (
            <p className="mt-2 text-sm font-medium text-danger" role="alert">
              Choose at least one round.
            </p>
          )}
        </fieldset>

        <Button type="submit" size="lg" block loading={busy} disabled={rounds.length === 0}>
          Create game
        </Button>
      </form>
    </Shell>
  );
}
