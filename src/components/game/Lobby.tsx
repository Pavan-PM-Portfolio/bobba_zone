import { LobbyPanel } from '../session/LobbyPanel';
import { api } from '../../lib/api';
import { roundTitle } from '../../lib/game';
import type { GameState, PlayerNumber } from '../../lib/types';

export function Lobby({ state, online, refresh }: { state: GameState; online: Set<PlayerNumber>; refresh: () => Promise<void> }) {
  const { room, me, players } = state;
  return (
    <LobbyPanel
      heading={room.couple_name || 'Who Is More Likely To?'}
      description={`${room.question_count} questions from ${room.settings.rounds.map(roundTitle).join(', ')}.`}
      inviteCode={room.invite_code}
      players={players}
      me={{ player_number: me.player_number, is_host: me.is_host, is_ready: me.is_ready }}
      online={online}
      onReady={async (r) => {
        await api.setReady(room.id, r);
        await refresh();
      }}
      onStart={async () => {
        await api.startGame(room.id);
        await refresh();
      }}
      onCancel={async () => {
        await api.cancelRoom(room.id);
        await refresh();
      }}
    />
  );
}
