import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { Shell } from '../components/ui/Shell';
import { FullPageLoader } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/Toast';
import { AnswerList, ResultsSummary } from '../components/game/ResultsSummary';
import { api } from '../lib/api';
import { toAppError, type AppError } from '../lib/errors';
import type { CompletedResults, PlayerNumber } from '../lib/types';

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });

export default function HistoryDetail() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState<CompletedResults | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (roomId) api.completedResults(roomId).then(setData).catch((e) => setError(toAppError(e)));
  }, [roomId]);

  async function remove() {
    if (!roomId) return;
    setDeleting(true);
    try {
      await api.deleteSession(roomId);
      toast('Game deleted.', 'success');
      navigate('/history', { replace: true });
    } catch (e) {
      toast(toAppError(e).message, 'error');
      setDeleting(false);
    }
  }

  const names: Record<PlayerNumber, string> = {
    1: data?.players.find((p) => p.player_number === 1)?.display_name ?? 'Player 1',
    2: data?.players.find((p) => p.player_number === 2)?.display_name ?? 'Player 2',
  };

  return (
    <Shell>
      <Link to="/history" className="inline-flex items-center gap-1 rounded-full text-sm font-semibold text-ink-soft hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden="true" /> Past games
      </Link>
      {error ? (
        <p className="mt-8 rounded-2xl bg-blush-soft p-5 font-medium text-rose-deep">{error.message}</p>
      ) : !data ? (
        <FullPageLoader />
      ) : (
        <div className="mt-4 space-y-8">
          <div>
            <h1 className="font-display text-4xl text-balance">{data.room.couple_name || `${names[1]} & ${names[2]}`}</h1>
            <p className="mt-2 text-ink-soft">Played {dateFmt.format(new Date(data.room.completed_at))}</p>
          </div>
          {data.results && <ResultsSummary results={data.results} names={names} questions={data.questions} />}
          <section aria-labelledby="all">
            <h2 id="all" className="font-display text-2xl">
              Every answer
            </h2>
            <div className="mt-4">
              <AnswerList questions={data.questions} names={names} />
            </div>
          </section>
          <div className="border-t border-line pt-6 text-center">
            <Button variant="ghost" icon={<Trash2 className="size-4" aria-hidden="true" />} onClick={() => setConfirm(true)}>
              Delete this game
            </Button>
          </div>
        </div>
      )}
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete this game?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Keep it
            </Button>
            <Button variant="danger" loading={deleting} onClick={remove}>
              Delete for both of us
            </Button>
          </>
        }
      >
        This permanently removes the game and every answer in it, for you and your partner.
      </Dialog>
    </Shell>
  );
}
