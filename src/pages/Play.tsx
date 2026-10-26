import { lazy, Suspense, useCallback, type ComponentType } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Shell } from '../components/ui/Shell';
import { ConnectionBadge } from '../components/ui/ConnectionBadge';
import { FullPageLoader } from '../components/ui/Spinner';
import { Avatar } from '../components/ui/Avatar';
import { buttonClass } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { LobbyPanel } from '../components/session/LobbyPanel';
import { useSession } from '../hooks/useSession';
import { GameGlyph, gameById } from '../games/registry';
import { api } from '../lib/api';
import type { PlayerNumber, SessionGame } from '../lib/types';
import type { GameProps } from '../games/types';

const MODULES: Record<SessionGame, ComponentType<GameProps>> = {
  know_me: lazy(() => import('../games/know-me/KnowMe')),
  love_story: lazy(() => import('../games/love-story/LoveStory')),
  after_hours: lazy(() => import('../games/after-hours/AfterHours')),
  future: lazy(() => import('../games/future/Future')),
  trust: lazy(() => import('../games/trust/Trust')),
  conflict: lazy(() => import('../games/conflict/Conflict')),
  quest: lazy(() => import('../games/quest/Quest')),
  mystery: lazy(() => import('../games/mystery/Mystery')),
  story: lazy(() => import('../games/story/Story')),
  after_dark: lazy(() => import('../games/after-dark/AfterDark')),
};

export function Ended({ title, body }: { title: string; body: string }) {
  return (
    <div className="pt-6">
      <h1 className="text-[1.6rem] font-semibold tracking-[-0.02em]">{title}</h1>
      <p className="mt-2 max-w-md text-ink-soft">{body}</p>
      <Link to="/" className={buttonClass('primary', 'md', 'mt-6')}>
        Back to dashboard
      </Link>
    </div>
  );
}

export default function Play() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const onEvent = useCallback(
    (ev: string) => {
      if (ev === 'deleted') {
        toast('This game was deleted.', 'info');
        navigate('/', { replace: true });
      }
    },
    [navigate, toast],
  );
  const s = useSession(sessionId, onEvent);
  const { view, error, connection, online } = s;
  const game = view ? gameById(view.session.game) : undefined;
  const me = view?.me.player_number;
  const partnerSeat: PlayerNumber | undefined = me ? (me === 1 ? 2 : 1) : undefined;
  const partner = view?.players.find((p) => p.player_number === partnerSeat);

  const aside = view ? (
    <span className="mr-1 flex items-center gap-2">
      {partner && (
        <span className="hidden items-center gap-1.5 text-sm text-ink-soft md:inline-flex">
          <Avatar name={partner.display_name} seat={partner.player_number} size="xs" online={online.has(partner.player_number)} />
          {online.has(partner.player_number) ? 'Here' : 'Away'}
        </span>
      )}
      {view.session.status === 'in_progress' && <ConnectionBadge connection={connection} />}
    </span>
  ) : undefined;

  let body;
  if (error && !view) body = <Ended title="Can't open this game" body={error.message} />;
  else if (!view || !game) body = <FullPageLoader label="Opening the game" />;
  else if (view.session.status === 'cancelled') body = <Ended title="This game was cancelled" body="It was closed before it finished." />;
  else if (view.session.status === 'expired') body = <Ended title="This game expired" body="Games close after 30 days without activity." />;
  else if (view.session.status === 'waiting') {
    const meRow = view.players.find((p) => p.player_number === view.me.player_number);
    body = (
      <LobbyPanel
        heading={view.session.title || game.title}
        description={game.description}
        inviteCode={view.session.invite_code}
        players={view.players}
        me={{ player_number: view.me.player_number, is_host: view.me.is_host, is_ready: Boolean(meRow?.is_ready) }}
        online={online}
        onReady={async (r) => {
          await api.setSessionReady(view.session.id, r);
          await s.refresh();
        }}
        onStart={async () => {
          await api.startSession(view.session.id);
          await s.refresh();
        }}
        onCancel={async () => {
          await api.cancelSession(view.session.id);
          await s.refresh();
        }}
      />
    );
  } else {
    const Game = MODULES[view.session.game];
    body = (
      <Suspense fallback={<FullPageLoader />}>
        <Game view={view} s={s} />
      </Suspense>
    );
  }

  return (
    <Shell aside={aside}>
      {game && (
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-ink-mute hover:text-ink">
            <ChevronLeft className="size-4" aria-hidden="true" />
            {view?.session.status === 'in_progress' ? 'Leave for now' : 'Dashboard'}
          </Link>
          <span className="flex items-center gap-2 text-sm text-ink-soft">
            <GameGlyph game={game} size="sm" />
            <span className="hidden sm:inline">{game.title}</span>
          </span>
        </div>
      )}
      {body}
    </Shell>
  );
}
