import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { SignInError, useAuth } from '../lib/auth';
import { formatInviteCode } from '../lib/game';

/** The brand mark at poster scale: two overlapping seats and the shared space between them. */
function Mark() {
  return (
    <svg viewBox="0 0 320 220" className="w-full max-w-[22rem]" aria-hidden="true">
      <circle cx="122" cy="110" r="96" fill="#F0A6BA" />
      <circle cx="198" cy="110" r="96" fill="#C9BDF2" fillOpacity=".9" />
      <path d="M160 35c26 21 42 48 42 75s-16 54-42 75c-26-21-42-48-42-75s16-54 42-75z" fill="#FFFCF8" />
    </svg>
  );
}

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
      // AuthProvider flips to signed_in and the requested page renders in place.
    } catch (err) {
      setError(err instanceof SignInError ? err.message : 'Sign-in failed. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-ink text-paper lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <span className="font-display text-xl">Who's More Likely?</span>
        </div>
        <div className="mx-auto w-full max-w-md">
          <Mark />
          <p className="mt-10 font-display text-[2.75rem] leading-[1.06] text-balance">A private game for the two of you.</p>
          <p className="mt-4 max-w-sm text-lg text-paper/70">
            Answer in secret, reveal together, and find out how alike you see each other.
          </p>
        </div>
        <p className="text-sm text-paper/50">Your answers are only ever visible to the two players in a game.</p>
      </aside>

      {/* Form */}
      <main id="main" className="flex flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-[24rem] flex-1 flex-col justify-center py-10">
          <span className="grid size-12 place-items-center rounded-2xl bg-lavender-soft text-lilac-deep">
            <LockKeyhole className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-6 font-display text-[2.4rem] leading-[1.08]">
            {invite ? 'Sign in to join' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-ink-soft">
            {invite
              ? `Your partner invited you to game ${formatInviteCode(invite)}. Sign in and you'll go straight there.`
              : 'Sign in with the email and password you were given.'}
          </p>

          <form onSubmit={submit} noValidate className="mt-8 space-y-5">
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
              placeholder="you@example.com"
              error={emailError}
            />
            <div className="relative">
              <Field
                label="Password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(null);
                }}
                className="[&_input]:pr-12"
                error={passwordError}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute top-[2.35rem] right-2 grid size-9 place-items-center rounded-full text-ink-mute hover:bg-ink/5 hover:text-ink"
                aria-label={show ? 'Hide password' : 'Show password'}
                aria-pressed={show}
              >
                {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>

            {error && (
              <p role="alert" className="rounded-2xl bg-blush-soft px-4 py-3 text-[0.95rem] font-medium text-rose-deep">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" block loading={busy}>
              Sign in
            </Button>
          </form>

          <p className="mt-8 text-sm text-ink-mute">
            No account yet, or forgot your password? Ask the person who set up the game to add you or reset it.
          </p>
        </div>
      </main>
    </div>
  );
}
