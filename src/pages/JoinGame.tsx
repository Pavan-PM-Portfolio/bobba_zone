import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Shell } from '../components/ui/Shell';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { api } from '../lib/api';
import { toAppError } from '../lib/errors';
import { formatInviteCode, isWellFormedInviteCode, normalizeInviteCode } from '../lib/game';
import { rememberName, rememberedName } from '../lib/prefs';
import { useAuth } from '../lib/auth';

export default function JoinGame() {
  const { code: codeParam } = useParams();
  const navigate = useNavigate();
  const { accountName } = useAuth();
  const [code, setCode] = useState(codeParam ? formatInviteCode(codeParam) : '');
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
      setCodeError('Codes are 8 letters and numbers, like K7QM 4XPA.');
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
      const res = await api.joinAny(normalizeInviteCode(code), n);
      rememberName(n);
      navigate(res.kind === 'room' ? `/room/${res.id}` : `/play/${res.id}`, { replace: true });
    } catch (err) {
      setFormError(toAppError(err).message);
      setBusy(false);
    }
  }

  return (
    <Shell>
      <PageHeader
        title={codeParam ? "You're invited" : 'Join a game'}
        description={codeParam ? 'Confirm your name to take your seat.' : 'Enter the code your partner shared with you.'}
      />
      <form onSubmit={submit} noValidate className="space-y-5">
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
          placeholder="K7QM 4XPA"
          className="[&_input]:font-mono [&_input]:text-lg [&_input]:tracking-[0.16em]"
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
          error={nameError}
        />
        {formError && (
          <p role="alert" className="rounded-[6px] bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" block loading={busy} className="!mt-7">
          Join game
        </Button>
      </form>
    </Shell>
  );
}
