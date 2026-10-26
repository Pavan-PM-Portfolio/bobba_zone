import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { Button, buttonClass } from '../ui/Button';
import { Confetti } from '../ui/Celebrate';
import { FullPageLoader } from '../ui/Spinner';
import { useToast } from '../ui/Toast';
import { SaveMoment } from '../session/Parts';
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
  const pct = Math.round(Number(state.results.agreement_percentage));

  return (
    <div className="space-y-8">
      <Confetti fire />
      <div>
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.025em]">{state.room.couple_name || 'Your results'}</h1>
        <p className="mt-1.5 text-ink-soft">{state.room.question_count} questions, played together.</p>
      </div>
      <ResultsSummary results={state.results} names={names} questions={details?.questions ?? null} />
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button size="lg" block loading={busy} onClick={playAgain} icon={<RotateCcw className="size-4" aria-hidden="true" />}>
          {state.room.next_room_id ? 'Join the next game' : 'Play again'}
        </Button>
        <Link to={`/history/${state.room.id}`} className={buttonClass('secondary', 'lg', 'w-full')}>
          See every answer
        </Link>
      </div>
      <div>
        <SaveMoment game="likely" roomId={state.room.id} defaultTitle={`Who Is More Likely: ${pct}% agreement`} />
      </div>
    </div>
  );
}
