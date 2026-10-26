import { lazy, Suspense } from 'react';
import { createHashRouter, Link, RouterProvider } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { isConfigured } from './lib/supabase';
import { ToastProvider } from './components/ui/Toast';
import { FullPageLoader } from './components/ui/Spinner';
import { Shell } from './components/ui/Shell';
import { Button } from './components/ui/Button';
import Welcome from './pages/Welcome';

const CreateGame = lazy(() => import('./pages/CreateGame'));
const JoinGame = lazy(() => import('./pages/JoinGame'));
const Room = lazy(() => import('./pages/Room'));
const History = lazy(() => import('./pages/History'));
const HistoryDetail = lazy(() => import('./pages/HistoryDetail'));

/** Pages that talk to the server wait for the guest session first. */
function Authed({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (auth.status === 'loading') return <FullPageLoader label="Getting things ready" />;
  if (auth.status === 'error')
    return (
      <Shell>
        <div className="pt-10 text-center">
          <h1 className="font-display text-3xl">We couldn't connect</h1>
          <p className="mx-auto mt-3 max-w-sm text-ink-soft">{auth.error}</p>
          <Button className="mt-6" onClick={auth.retry}>
            Try again
          </Button>
        </div>
      </Shell>
    );
  return <Suspense fallback={<FullPageLoader />}>{children}</Suspense>;
}

function NotFound() {
  return (
    <Shell>
      <div className="pt-10 text-center">
        <h1 className="font-display text-4xl">Page not found</h1>
        <Link to="/" className="mt-6 inline-flex h-12 items-center rounded-full bg-ink px-7 font-semibold text-paper">
          Back to home
        </Link>
      </div>
    </Shell>
  );
}

function SetupNeeded() {
  return (
    <Shell>
      <h1 className="font-display text-3xl">Almost there</h1>
      <p className="mt-3 text-ink-soft">
        This build has no Supabase connection. Set <code>VITE_SUPABASE_URL</code> and{' '}
        <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> (see README), then rebuild.
      </p>
    </Shell>
  );
}

// Hash routing keeps deep links (invites) working on GitHub Pages subpaths
// with no server-side rewrites: /bobba_zone/#/join/ABCD2345
const router = createHashRouter([
  { path: '/', element: <Welcome /> },
  { path: '/create', element: <Authed><CreateGame /></Authed> },
  { path: '/join', element: <Authed><JoinGame /></Authed> },
  { path: '/join/:code', element: <Authed><JoinGame /></Authed> },
  { path: '/room/:roomId', element: <Authed><Room /></Authed> },
  { path: '/history', element: <Authed><History /></Authed> },
  { path: '/history/:roomId', element: <Authed><HistoryDetail /></Authed> },
  { path: '*', element: <NotFound /> },
]);

const setupRouter = createHashRouter([{ path: '*', element: <SetupNeeded /> }]);

export default function App() {
  if (!isConfigured) return <RouterProvider router={setupRouter} />;
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  );
}
