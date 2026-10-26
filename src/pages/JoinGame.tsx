import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Shell } from '../components/ui/Shell';
import { Card } from '../components/ui/Card';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import { toAppError } from '../lib/errors';
import { formatInviteCode, isWellFormedInviteCode, normalizeInviteCode } from '../lib/game';
import { rememberName, rememberedName } from '../lib/prefs';
import { useAuth } from '../lib/auth';

export default function JoinGame() {
  const { code: codeParam } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(codeParam ? formatInviteCode(codeParam) : '');
  const { accountName } = useAuth();
  const [name, setName] = useState(() => rememberedName() || accountName);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (codeParam) setCode(formatInviteCode(codeParam));
  }, [codeParam]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    let ok = true;
    if (!isWellFormedInviteCode(code)) {
      setCodeError('Codes are 8 letters and numbers, like ABCD 2345.');
      ok = false;
    }
    const n = name.trim();
    if (!n || n.length > 30) {
      setNameError('Enter a name between 1 and 30 characters.');
      ok = false;
    }
    if (!ok) return;
    setBusy(true);
    try {
      const res = await api.joinRoom(normalizeInviteCode(code), n);
      rememberName(n);
      navigate(`/room/${res.room_id}`, { replace: true });
    } catch (err) {
      setFormError(toAppError(err).message);
      setBusy(false);
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-4xl">Join a game</h1>
      <p className="mt-2 text-ink-soft">
        {codeParam ? "You've been invited. Add your name to take your seat." : 'Enter the code your partner shared with you.'}
      </p>
      <form onSubmit={submit} noValidate className="mt-8 space-y-6">
        <Card className="space-y-5 p-5 sm:p-6">
          <Field
            label="Game code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setCodeError(null);
            }}
            maxLength={12}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            placeholder="ABCD 2345"
            className="[&_input]:font-mono [&_input]:tracking-[0.2em]"
            error={codeError}
          />
          <Field
            label="Your name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
            maxLength={30}
            autoComplete="given-name"
            placeholder="e.g. Pavan"
            error={nameError}
          />
        </Card>
        {formError && (
          <p role="alert" className="rounded-2xl bg-blush-soft px-4 py-3 text-[0.95rem] font-medium text-rose-deep">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" block loading={busy}>
          Join game
        </Button>
      </form>
    </Shell>
  );
}
