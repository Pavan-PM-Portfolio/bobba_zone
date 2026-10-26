import { useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Lobby } from '../components/game/Lobby';
import { QuestionView } from '../components/game/QuestionView';
import { ResultsView } from '../components/game/ResultsView';
import { Shell } from '../components/ui/Shell';
import { ConnectionBadge } from '../components/ui/ConnectionBadge';
import { FullPageLoader } from '../components/ui/Spinner';
import { Avatar } from '../components/ui/Avatar';
import { useToast } from '../components/ui/Toast';
import { useRoom, type RoomEvent } from '../hooks/useRoom';
import { GameGlyph, gameById } from '../games/registry';
import { Ended } from './Play';
import type { PlayerNumber } from '../lib/types';

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const onEvent = useCallback(
    (e: RoomEvent) => {
      if (e.event === 'play_again' && typeof e.payload.next_room_id === 'string') {
        toast('A new game is ready.', 'info');
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
  const game = gameById('likely')!;

  const aside = state ? (
    <span className="mr-1 flex items-center gap-2">
      {partner && (
        <span className="hidden items-center gap-1.5 text-sm text-ink-soft md:inline-flex">
          <Avatar name={partner.display_name} seat={partner.player_number} size="xs" online={onlinePlayers.has(partner.player_number)} />
          {onlinePlayers.has(partner.player_number) ? 'Here' : 'Away'}
        </span>
      )}
      {state.room.status === 'in_progress' && <ConnectionBadge connection={connection} />}
    </span>
  ) : undefined;

  let body;
  if (loading && !state) body = <FullPageLoader label="Opening the game" />;
  else if (error && !state) body = <Ended title="Can't open this game" body={error.message} />;
  else if (!state) body = <FullPageLoader />;
  else if (state.room.status === 'waiting') body = <Lobby state={state} online={onlinePlayers} refresh={refresh} />;
  else if (state.room.status === 'in_progress') body = state.current ? <QuestionView state={state} refresh={refresh} /> : <FullPageLoader />;
  else if (state.room.status === 'completed') body = <ResultsView state={state} />;
  else if (state.room.status === 'expired') body = <Ended title="This game expired" body="Games close after a day without activity." />;
  else body = <Ended title="This game was cancelled" body="It was closed before it finished." />;

  return (
    <Shell aside={aside}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-ink-mute hover:text-ink">
          <ChevronLeft className="size-4" aria-hidden="true" />
          {state?.room.status === 'in_progress' ? 'Leave for now' : 'Dashboard'}
        </Link>
        <span className="flex items-center gap-2 text-sm text-ink-soft">
          <GameGlyph game={game} size="sm" />
          <span className="hidden sm:inline">{game.title}</span>
        </span>
      </div>
      {body}
    </Shell>
  );
}
