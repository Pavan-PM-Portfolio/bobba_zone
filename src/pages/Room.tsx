import { useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Lobby } from '../components/game/Lobby';
import { QuestionView } from '../components/game/QuestionView';
import { ResultsView } from '../components/game/ResultsView';
import { Shell } from '../components/ui/Shell';
import { ConnectionBadge } from '../components/ui/ConnectionBadge';
import { FullPageLoader } from '../components/ui/Spinner';
import { Avatar } from '../components/ui/Avatar';
import { useToast } from '../components/ui/Toast';
import { useRoom, type RoomEvent } from '../hooks/useRoom';
import type { PlayerNumber } from '../lib/types';

function Ended({ title, body }: { title: string; body: string }) {
  return (
    <div className="pt-10 text-center">
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="mx-auto mt-3 max-w-sm text-ink-soft">{body}</p>
      <div className="mt-8 flex flex-col items-center gap-3">
        <Link to="/create" className="inline-flex h-12 items-center rounded-full bg-ink px-7 font-semibold text-paper">
          Start a new game
        </Link>
        <Link to="/" className="font-semibold text-ink-soft underline-offset-4 hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const onEvent = useCallback(
    (e: RoomEvent) => {
      if (e.event === 'play_again' && typeof e.payload.next_room_id === 'string') {
        toast('A new game is ready. Taking you there.', 'info');
        navigate(`/room/${e.payload.next_room_id}`);
      } else if (e.event === 'room_deleted') {
        toast('This game was deleted.', 'info');
        navigate('/', { replace: true });
      }
    },
    [navigate, toast],
  );

  const { state, error, loading, connection, onlinePlayers, refresh } = useRoom(roomId, onEvent);

  const partnerSeat: PlayerNumber | null = state ? (state.me.player_number === 1 ? 2 : 1) : null;
  const partner = state?.players.find((p) => p.player_number === partnerSeat);

  const aside = state ? (
    <div className="flex items-center gap-2">
      {partner && state.room.status === 'in_progress' && (
        <span className="hidden items-center gap-2 text-sm text-ink-soft sm:inline-flex">
          <Avatar name={partner.display_name} seat={partner.player_number} size="sm" online={onlinePlayers.has(partner.player_number)} />
          {onlinePlayers.has(partner.player_number) ? 'Here' : 'Away'}
        </span>
      )}
      <ConnectionBadge connection={connection} />
    </div>
  ) : undefined;

  let body;
  if (loading && !state) body = <FullPageLoader label="Opening your game" />;
  else if (error && !state)
    body = <Ended title="Can't open this game" body={error.message} />;
  else if (!state) body = <FullPageLoader />;
  else {
    switch (state.room.status) {
      case 'waiting':
        body = <Lobby state={state} online={onlinePlayers} refresh={refresh} />;
        break;
      case 'in_progress':
        body = state.current ? <QuestionView state={state} refresh={refresh} /> : <FullPageLoader />;
        break;
      case 'completed':
        body = <ResultsView state={state} />;
        break;
      case 'expired':
        body = <Ended title="This game expired" body="Games close after a day without activity, so the invite no longer works." />;
        break;
      default:
        body = <Ended title="This game was cancelled" body="The person who created it closed the room." />;
    }
  }

  return <Shell aside={aside}>{body}</Shell>;
}
