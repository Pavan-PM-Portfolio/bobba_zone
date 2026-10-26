import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Confetti } from '../ui/Celebrate';
import { FullPageLoader } from '../ui/Spinner';
import { useToast } from '../ui/Toast';
import { api } from '../../lib/api';
import { toAppError } from '../../lib/errors';
import type { CompletedResults, GameState, PlayerNumber } from '../../lib/types';
import { ResultsSummary } from './ResultsSummary';

export function ResultsView({ state }: { state: GameState }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [details, setDetails] = useState<CompletedResults | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.completedResults(state.room.id).then(setDetails).catch(() => setDetails(null));
  }, [state.room.id]);

  const names: Record<PlayerNumber, string> = {
    1: state.players.find((p) => p.player_number === 1)?.display_name ?? 'Player 1',
    2: state.players.find((p) => p.player_number === 2)?.display_name ?? 'Player 2',
  };

  async function playAgain() {
    setBusy(true);
    try {
      const r = await api.playAgain(state.room.id);
      navigate(`/room/${r.room_id}`);
    } catch (e) {
      toast(toAppError(e).message, 'error');
      setBusy(false);
    }
  }

  if (!state.results) return <FullPageLoader label="Adding up your answers" />;

  return (
    <div className="space-y-8">
      <Confetti fire />
      <div>
        <h1 className="font-display text-4xl text-balance">{state.room.couple_name ? `${state.room.couple_name}, you did it` : 'Your results'}</h1>
        <p className="mt-2 text-ink-soft">{state.room.question_count} questions played together.</p>
      </div>
      <ResultsSummary results={state.results} names={names} questions={details?.questions ?? null} />
      <div className="space-y-3">
        <Button size="lg" block loading={busy} onClick={playAgain} icon={<RotateCcw className="size-4" aria-hidden="true" />}>
          {state.room.next_room_id ? 'Join the next game' : 'Play again'}
        </Button>
        <Link
          to={`/history/${state.room.id}`}
          className="flex h-12 items-center justify-center rounded-full font-semibold text-ink-soft hover:bg-ink/5 hover:text-ink"
        >
          See every answer
        </Link>
      </div>
    </div>
  );
}
