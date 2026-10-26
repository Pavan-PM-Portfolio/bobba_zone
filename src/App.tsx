import { lazy, Suspense } from 'react';
import { createHashRouter, Link, Navigate, RouterProvider } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { isConfigured } from './lib/supabase';
import { ToastProvider } from './components/ui/Toast';
import { FullPageLoader } from './components/ui/Spinner';
import { Shell } from './components/ui/Shell';
import Welcome from './pages/Welcome';

const Login = lazy(() => import('./pages/Login'));
const CreateGame = lazy(() => import('./pages/CreateGame'));
const JoinGame = lazy(() => import('./pages/JoinGame'));
const Room = lazy(() => import('./pages/Room'));
const History = lazy(() => import('./pages/History'));
const HistoryDetail = lazy(() => import('./pages/HistoryDetail'));

/** Pages that talk to the server need a signed-in account. */
function Authed({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (auth.status === 'loading') return <FullPageLoader label="Getting things ready" />;
  // Login renders in place, so after signing in the requested page
  // (e.g. an invite link) appears without any redirect.
  if (auth.status === 'signed_out')
    return (
      <Suspense fallback={<FullPageLoader />}>
        <Login />
      </Suspense>
    );
  return <Suspense fallback={<FullPageLoader />}>{children}</Suspense>;
}

function SignedInRedirect() {
  return <Navigate to="/" replace />;
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
  { path: '/login', element: <Authed><SignedInRedirect /></Authed> },
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
