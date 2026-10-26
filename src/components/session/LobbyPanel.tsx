import { useState, type ReactNode } from 'react';
import { Check, Copy, Share } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Dialog } from '../ui/Dialog';
import { useToast } from '../ui/Toast';
import { buildInviteUrl, formatInviteCode } from '../../lib/game';
import type { PlayerNumber, PlayerSummary } from '../../lib/types';

/** Shared lobby used by every game: invite, seats, ready state, start. */
export function LobbyPanel({
  heading,
  description,
  inviteCode,
  players,
  me,
  online,
  onReady,
  onStart,
  onCancel,
  extra,
}: {
  heading: ReactNode;
  description?: ReactNode;
  inviteCode: string;
  players: PlayerSummary[];
  me: { player_number: PlayerNumber; is_host: boolean; is_ready: boolean };
  online: Set<PlayerNumber>;
  onReady: (ready: boolean) => Promise<unknown>;
  onStart: () => Promise<unknown>;
  onCancel: () => Promise<unknown>;
  extra?: ReactNode;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const inviteUrl = buildInviteUrl(inviteCode, window.location.origin, import.meta.env.BASE_URL);
  const partner = players.find((p) => p.player_number !== me.player_number);
  const bothReady = players.length === 2 && players.every((p) => p.is_ready);
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast('Copying is blocked here. Select the code and copy it instead.', 'error');
    }
  }

  const status = !partner
    ? 'Waiting for your partner to join.'
    : !bothReady
      ? 'You can start once you are both ready.'
      : me.is_host
        ? 'You are both ready.'
        : `Waiting for ${partner.display_name} to start.`;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.025em] text-balance">{heading}</h1>
        {description && <p className="mt-1.5 text-ink-soft">{description}</p>}
      </div>

      {!partner && (
        <Card raised className="mb-6 p-5 sm:p-6">
          <p className="text-sm font-medium text-ink-soft">Invite your partner</p>
          <p
            className="tabular mt-2 font-mono text-[2rem] leading-tight font-semibold tracking-[0.14em] select-all"
            aria-label={`Game code ${inviteCode.split('').join(' ')}`}
          >
            {formatInviteCode(inviteCode)}
          </p>
          <div className="mt-5 flex items-center gap-2 rounded-[6px] bg-mist py-1.5 pr-1.5 pl-3 shadow-hairline">
            <span className="min-w-0 flex-1 truncate font-mono text-[0.8rem] text-ink-soft">{inviteUrl.replace(/^https?:\/\//, '')}</span>
            <Button size="sm" variant="secondary" onClick={copyLink} icon={copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}>
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            {canShare && (
              <Button
                size="sm"
                variant="secondary"
                aria-label="Share invite"
                icon={<Share className="size-4" />}
                onClick={() => navigator.share({ title: 'Between Us', text: `Join me: ${formatInviteCode(inviteCode)}`, url: inviteUrl }).catch(() => {})}
              >
                <span className="sr-only">Share</span>
              </Button>
            )}
          </div>
        </Card>
      )}

      {extra}

      <Card className="divide-y divide-line">
        {([1, 2] as PlayerNumber[]).map((seat) => {
          const p = players.find((x) => x.player_number === seat);
          const isMe = seat === me.player_number;
          const here = isMe || online.has(seat);
          return (
            <div key={seat} className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
              <Avatar name={p?.display_name ?? null} seat={seat} online={p ? here : undefined} />
              <div className="min-w-0 flex-1">
                {p ? (
                  <>
                    <p className="truncate font-medium">
                      {p.display_name}
                      {isMe && <span className="font-normal text-ink-mute"> (you)</span>}
                    </p>
                    <p className="text-sm text-ink-mute">{here ? 'Here now' : 'Away'}</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-ink-mute">Open seat</p>
                    <p className="text-sm text-ink-mute">Fills when your partner joins</p>
                  </>
                )}
              </div>
              {p && (
                <span
                  className={`inline-flex h-6 items-center gap-1 rounded-[4px] px-2 text-xs font-medium ${
                    p.is_ready ? 'bg-success-soft text-success' : 'bg-mist text-ink-mute'
                  }`}
                >
                  {p.is_ready && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
                  {p.is_ready ? 'Ready' : 'Not ready'}
                </span>
              )}
            </div>
          );
        })}
      </Card>

      <p className="mt-4 text-sm text-ink-mute" aria-live="polite">
        {status}
      </p>

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <Button
          size="lg"
          block
          variant={me.is_ready || (me.is_host && bothReady) ? 'secondary' : 'primary'}
          loading={busy === 'ready'}
          onClick={() => run('ready', () => onReady(!me.is_ready))}
        >
          {me.is_ready ? 'Not ready' : "I'm ready"}
        </Button>
        {me.is_host && (
          <Button size="lg" block disabled={!bothReady} loading={busy === 'start'} onClick={() => run('start', onStart)}>
            Start game
          </Button>
        )}
      </div>

      <div className="mt-8 border-t border-line pt-5">
        <button type="button" onClick={() => setConfirmCancel(true)} className="text-sm font-medium text-ink-mute hover:text-danger">
          Cancel this game
        </button>
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
            <Button variant="danger" loading={busy === 'cancel'} onClick={() => run('cancel', onCancel).then(() => setConfirmCancel(false))}>
              Cancel game
            </Button>
          </>
        }
      >
        The invite link stops working and the game is closed for both of you.
      </Dialog>
    </div>
  );
}
