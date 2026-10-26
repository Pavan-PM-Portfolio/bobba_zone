import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { LogoMark } from '../components/ui/Logo';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { GAMES } from '../games/registry';
import { SignInError, useAuth } from '../lib/auth';
import { formatInviteCode } from '../lib/game';

export default function Login() {
  const { signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const invite = location.pathname.match(/^\/join\/([A-Za-z0-9]+)/)?.[1];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    let ok = true;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailError('Enter the email address for your account.');
      ok = false;
    }
    if (!password) {
      setPasswordError('Enter your password.');
      ok = false;
    }
    if (!ok) return;
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof SignInError ? err.message : 'Sign-in failed. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,34rem)]">
      <main id="main" className="flex flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10 sm:px-10">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <span className="font-semibold tracking-[-0.015em]">Between Us</span>
        </div>
        <div className="mx-auto flex w-full max-w-[23rem] flex-1 flex-col justify-center py-12">
          <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.025em]">{invite ? 'Sign in to join' : 'Sign in'}</h1>
          <p className="mt-1.5 text-ink-soft">
            {invite ? `Game ${formatInviteCode(invite)} is waiting for you.` : 'Welcome back. Use the email and password you were given.'}
          </p>
          <form onSubmit={submit} noValidate className="mt-8 space-y-4">
            <Field
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
              error={emailError}
            />
            <Field
              label="Password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError(null);
              }}
              error={passwordError}
              trailing={
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="grid size-8 place-items-center rounded-[4px] text-ink-mute hover:text-ink"
                  aria-label={show ? 'Hide password' : 'Show password'}
                  aria-pressed={show}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
            />
            {error && (
              <p role="alert" className="rounded-[6px] bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" block loading={busy} className="!mt-6">
              Sign in
            </Button>
          </form>
          <p className="mt-8 text-sm text-ink-mute">Accounts are created by whoever set up Between Us. Ask them if you need access or a new password.</p>
        </div>
      </main>

      <aside className="hidden border-l border-line bg-shell lg:flex lg:flex-col lg:justify-center lg:px-14">
        <p className="text-sm font-medium text-accent-deep">Private games for two</p>
        <p className="mt-3 max-w-[22rem] text-[1.6rem] leading-snug font-semibold tracking-[-0.025em] text-ink">
          Learn how each other thinks, one question at a time.
        </p>
        <ul className="mt-10 space-y-2.5">
          {GAMES.map((g) => (
            <li key={g.id} className="flex items-center gap-3 text-[0.95rem] text-ink-soft">
              <span className="size-1.5 rounded-full" style={{ background: g.tint.fg }} aria-hidden="true" />
              {g.title}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
