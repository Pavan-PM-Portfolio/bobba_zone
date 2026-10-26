import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Dialog } from '../ui/Dialog';
import { useToast } from '../ui/Toast';
import { api } from '../../lib/api';
import { toAppError } from '../../lib/errors';
import { buildInviteUrl, formatInviteCode, roundTitle } from '../../lib/game';
import type { GameState, PlayerNumber } from '../../lib/types';

export function Lobby({
  state,
  online,
  refresh,
}: {
  state: GameState;
  online: Set<PlayerNumber>;
  refresh: () => Promise<void>;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { room, me, players } = state;
  const inviteUrl = buildInviteUrl(room.invite_code, window.location.origin, import.meta.env.BASE_URL);
  const partner = players.find((p) => p.player_number !== me.player_number);
  const bothReady = players.length === 2 && players.every((p) => p.is_ready);

  async function run(key: string, fn: () => Promise<unknown>, success?: string) {
    setBusy(key);
    try {
      await fn();
      await refresh();
      if (success) toast(success, 'success');
    } catch (e) {
      toast(toAppError(e).message, 'error');
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast('Invite link copied.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Copying is blocked here. Long-press the code to copy it instead.', 'error');
    }
  }

  async function share() {
    try {
      await navigator.share({
        title: "Who's More Likely? Couples Edition",
        text: `Play with me! Code ${formatInviteCode(room.invite_code)}`,
        url: inviteUrl,
      });
    } catch {
      /* dismissed */
    }
  }

  const seats: PlayerNumber[] = [1, 2];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-balance">{room.couple_name || 'Your game room'}</h1>
        <p className="mt-2 text-ink-soft">
          {room.question_count} questions from {room.settings.rounds.map(roundTitle).join(', ')}.
        </p>
      </div>

      {!partner && (
        <Card className="p-5 sm:p-6">
          <p className="font-semibold">Invite your partner</p>
          <p className="mt-1 text-sm text-ink-mute">Send the link, or read out the code.</p>
          <p
            className="mt-4 select-all rounded-2xl bg-shell py-4 text-center font-mono text-[2rem] font-semibold tracking-[0.18em] sm:text-[2.4rem]"
            aria-label={`Game code ${room.invite_code.split('').join(' ')}`}
          >
            {formatInviteCode(room.invite_code)}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" onClick={copyLink} icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}>
              {copied ? 'Copied' : 'Copy invite link'}
            </Button>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <Button variant="secondary" onClick={share} icon={<Share2 className="size-4" />}>
                Share
              </Button>
            )}
          </div>
        </Card>
      )}

      <Card className="divide-y divide-line">
        {seats.map((seat) => {
          const p = players.find((x) => x.player_number === seat);
          const isMe = seat === me.player_number;
          return (
            <div key={seat} className="flex items-center gap-4 p-4 sm:p-5">
              <Avatar name={p?.display_name ?? null} seat={seat} online={p ? isMe || online.has(seat) : undefined} />
              <div className="min-w-0 flex-1">
                {p ? (
                  <>
                    <p className="truncate font-semibold">
                      {p.display_name}
                      {isMe && <span className="font-normal text-ink-mute"> (you)</span>}
                    </p>
                    <p className="text-sm text-ink-mute">
                      {isMe || online.has(seat) ? 'Here now' : 'Away'}
                      {p.is_host ? ', created the game' : ''}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-ink-mute">Waiting for your partner</p>
                    <p className="text-sm text-ink-mute">This seat fills as soon as they join.</p>
                  </>
                )}
              </div>
              {p && (
                <span
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ${
                    p.is_ready ? 'bg-[#e3f3ea] text-success' : 'bg-shell text-ink-mute'
                  }`}
                >
                  {p.is_ready && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
                  {p.is_ready ? 'Ready' : 'Not ready'}
                </span>
              )}
            </div>
          );
        })}
      </Card>

      <div className="space-y-3">
        <Button
          size="lg"
          block
          variant={me.is_ready ? 'secondary' : 'primary'}
          loading={busy === 'ready'}
          onClick={() => run('ready', () => api.setReady(room.id, !me.is_ready))}
        >
          {me.is_ready ? "I'm not ready yet" : "I'm ready"}
        </Button>
        {me.is_host ? (
          <>
            <Button
              size="lg"
              block
              variant="primary"
              disabled={!bothReady}
              loading={busy === 'start'}
              onClick={() => run('start', () => api.startGame(room.id))}
            >
              Start the game
            </Button>
            <p className="text-center text-sm text-ink-mute" aria-live="polite">
              {!partner
                ? 'You can start once your partner joins and you are both ready.'
                : !bothReady
                  ? 'Starts when you are both ready.'
                  : 'All set. Start whenever you like.'}
            </p>
            <div className="text-center">
              <Button variant="ghost" onClick={() => setConfirmCancel(true)}>
                Cancel this game
              </Button>
            </div>
          </>
        ) : (
          <p className="text-center text-sm text-ink-mute" aria-live="polite">
            {bothReady ? `Waiting for ${partner?.display_name ?? 'your partner'} to start.` : 'The game starts when you are both ready.'}
          </p>
        )}
      </div>

      <Dialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel this game?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              loading={busy === 'cancel'}
              onClick={() => run('cancel', () => api.cancelRoom(room.id)).then(() => setConfirmCancel(false))}
            >
              Cancel game
            </Button>
          </>
        }
      >
        The invite link will stop working for your partner.
      </Dialog>
    </div>
  );
}
