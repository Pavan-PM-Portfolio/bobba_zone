import { useMemo } from 'react';
import { EyeOff, LockKeyhole, Send, Timer } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Note, StepProgress, TextAnswer, Waiting } from '../../../components/session/Parts';
import { entriesFor, partnerHasPending, seatNames } from '../../../hooks/useSession';
import { seededShuffle } from '../../../lib/random';
import type { PlayerNumber, SessionView } from '../../../lib/types';
import { useBusy, useDraft, useStep } from '../../flow';
import type { ModeProps } from '../AfterDark';
import { DESIRES } from '../content/desires';
import { allowed, type Prompt } from '../content/taxonomy';
import { Recap, RecapList } from '../Recap';
import { FavouriteButton, PromptCard, playedIds, stablePool } from '../shared';

const ROUNDS = 8;
const BY_ID: Record<string, Prompt> = Object.fromEntries(DESIRES.map((p) => [p.id, p]));
type Sharing = 'after' | 'now' | 'private';
const SHARING: { id: Sharing; title: string; detail: string; icon: typeof Timer }[] = [
  { id: 'after', title: 'Reveal after we both answer', detail: 'Shown to your partner once they have answered too. Cannot be undone.', icon: Timer },
  { id: 'now', title: 'Reveal to my partner now', detail: 'Visible straight away. You can make it private again later.', icon: Send },
  { id: 'private', title: 'Keep private', detail: 'Only you will ever see this. You can share it later if you change your mind.', icon: EyeOff },
];

/**
 * Storage per prompt i:
 *   seal:sd{i}  always written. Holds the answer for "after", or {withheld:true}
 *               for "now"/"private", so the reveal rule ("both answered") works
 *               without ever carrying a private answer.
 *   pub:sd{i}   the answer, when shared now
 *   priv:sd{i}  the answer, when kept private (never visible to the partner)
 */
function myAnswer(view: SessionView, i: number, seat: PlayerNumber): { text: string; sharing: Sharing } | null {
  const seal = entriesFor<{ text?: string; withheld?: boolean }>(view, `seal:sd${i}`)[seat]?.payload;
  if (!seal) return null;
  if (seal.text) return { text: seal.text, sharing: 'after' };
  const pub = entriesFor<{ text: string }>(view, `pub:sd${i}`)[seat]?.payload;
  if (pub) return { text: pub.text, sharing: 'now' };
  const priv = entriesFor<{ text: string }>(view, `priv:sd${i}`)[seat]?.payload;
  return priv ? { text: priv.text, sharing: 'private' } : { text: '', sharing: 'private' };
}

/** What the viewer is allowed to see of the partner's answer. */
function partnerView(view: SessionView, i: number, partner: PlayerNumber): { answered: boolean; text?: string } {
  const key = `seal:sd${i}`;
  const seal = entriesFor<{ text?: string; withheld?: boolean }>(view, key)[partner]?.payload;
  const pub = entriesFor<{ text: string }>(view, `pub:sd${i}`)[partner]?.payload;
  if (pub) return { answered: true, text: pub.text };
  if (seal) return { answered: true, text: seal.text };
  return { answered: partnerHasPending(view, key) };
}

export default function SecretDesires({ view, s, terms }: ModeProps) {
  const played = playedIds(view, (i) => `seal:sd${i}`, ROUNDS);
  const prompts = useMemo(
    () => stablePool(seededShuffle(DESIRES.filter((p) => allowed(p, terms)), view.session.id), BY_ID, played, ROUNDS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view.session.id, terms, played.join('|')],
  );
  const { step, next } = useStep(view, s);
  if (view.session.status === 'completed' || (prompts.length > 0 && step >= prompts.length)) return <DesiresRecap view={view} s={s} terms={terms} prompts={prompts} />;
  if (!prompts.length) return <Note tone="pink">No prompts match your shared boundaries. Open Boundaries to include more categories.</Note>;
  return <DesireStep key={step} view={view} s={s} terms={terms} p={prompts[step]!} i={step} total={prompts.length} onNext={next} />;
}

function DesireStep({ view, s, p, i, total, onNext }: ModeProps & { p: Prompt; i: number; total: number; onNext: () => Promise<boolean> }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner: PlayerNumber = me === 1 ? 2 : 1;
  const mine = myAnswer(view, i, me);
  const theirs = partnerView(view, i, partner);
  const [text, setText] = useDraft(`sd${i}`, '');
  const [sharing, setSharing] = useDraft<Sharing | null>(`sh${i}`, null);

  async function submit() {
    const t = text.trim();
    if (sharing === 'after') {
      await s.submit(`seal:sd${i}`, { text: t, id: p.id });
    } else if (sharing === 'now') {
      await s.submit(`pub:sd${i}`, { text: t });
      await s.submit(`seal:sd${i}`, { withheld: true, id: p.id });
    } else {
      await s.submit(`priv:sd${i}`, { text: t });
      await s.submit(`seal:sd${i}`, { withheld: true, id: p.id });
    }
  }
  async function changeSharing(to: 'now' | 'private') {
    if (!mine) return;
    if (to === 'now') {
      await s.submit(`pub:sd${i}`, { text: mine.text });
      await s.remove(`priv:sd${i}`);
    } else {
      await s.submit(`priv:sd${i}`, { text: mine.text });
      await s.remove(`pub:sd${i}`);
    }
  }

  return (
    <div className="space-y-6">
      <StepProgress index={i} total={total} label="Secret Desires" />
      <PromptCard animateKey={p.id} kicker="For your eyes first" aside={<FavouriteButton view={view} s={s} id={p.id} text={p.text} />}>
        {p.text}
      </PromptCard>

      {!mine ? (
        <div className="space-y-4">
          <TextAnswer label="Your answer" value={text} onChange={setText} max={600} rows={4} placeholder="Write as much or as little as you like" />
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Who can see this answer?</legend>
            <div className="space-y-2" role="radiogroup" aria-label="Sharing">
              {SHARING.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={sharing === o.id}
                  onClick={() => setSharing(o.id)}
                  className={`flex w-full items-start gap-3 rounded-[10px] px-4 py-3 text-left ${sharing === o.id ? 'bg-shell shadow-[0_0_0_1.5px_var(--color-accent)]' : 'bg-white shadow-[0_0_0_1px_var(--color-line-strong)] hover:bg-mist'}`}
                >
                  <o.icon className={`mt-0.5 size-4 shrink-0 ${sharing === o.id ? 'text-accent' : 'text-ink-mute'}`} aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-medium">{o.title}</span>
                    <span className="block text-xs text-ink-mute">{o.detail}</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
          <Button size="lg" block disabled={!text.trim() || !sharing} loading={busy === 'save'} onClick={() => run('save', submit)}>
            Save answer
          </Button>
        </div>
      ) : (
        <div className="rounded-[10px] bg-white p-4 shadow-hairline">
          <p className="flex items-center gap-2 text-sm font-medium">
            {mine.sharing === 'private' ? <LockKeyhole className="size-4 text-ink-mute" /> : mine.sharing === 'now' ? <Send className="size-4 text-accent" /> : <Timer className="size-4 text-accent" />}
            Your answer,{' '}
            {mine.sharing === 'private' ? 'kept private: only you can see it' : mine.sharing === 'now' ? `shared with ${names[partner]}` : theirs.answered ? `revealed to ${names[partner]}` : `revealed once ${names[partner]} answers`}
          </p>
          <p className="mt-2 whitespace-pre-line">{mine.text}</p>
          {mine.sharing !== 'after' && (
            <Button size="sm" variant="ghost" className="mt-2 -ml-2" loading={busy === 'chg'} onClick={() => run('chg', () => changeSharing(mine.sharing === 'private' ? 'now' : 'private'))}>
              {mine.sharing === 'private' ? 'Share it with my partner' : 'Make it private again'}
            </Button>
          )}
        </div>
      )}

      {mine &&
        (theirs.answered ? (
          theirs.text ? (
            <div className="animate-flip rounded-[10px] bg-shell p-4">
              <p className="text-sm font-medium text-accent-deep">{names[partner]} shared</p>
              <p className="mt-1.5 whitespace-pre-line">{theirs.text}</p>
            </div>
          ) : (
            <Note>{names[partner]} has answered and chose not to share this one. That's completely fine.</Note>
          )
        ) : (
          <Waiting>Waiting for {names[partner]} to answer.</Waiting>
        ))}

      {mine && theirs.answered && (
        <Button size="lg" block loading={busy === 'next'} onClick={() => run('next', async () => {
          await onNext();
          if (i + 1 >= total) await s.complete();
        })}>
          {i + 1 >= total ? 'See the recap' : 'Next prompt'}
        </Button>
      )}
    </div>
  );
}

function DesiresRecap({ view, s, prompts }: ModeProps & { prompts: Prompt[] }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner: PlayerNumber = me === 1 ? 2 : 1;
  if (view.session.status !== 'completed') {
    return (
      <Button size="lg" block loading={busy === 'c'} onClick={() => run('c', () => s.complete())}>
        See the recap
      </Button>
    );
  }
  const rows = prompts.map((p, i) => ({ p, mine: myAnswer(view, i, me), theirs: partnerView(view, i, partner) }));
  const sharedByThem = rows.filter((r) => r.theirs.text);
  const myPrivate = rows.filter((r) => r.mine?.sharing === 'private');
  return (
    <Recap
      view={view}
      mode="desires"
      title="Secret Desires"
      stats={[
        ['Prompts', rows.filter((r) => r.mine).length],
        [`Shared by ${names[partner]}`, sharedByThem.length],
        ['Shared by you', rows.filter((r) => r.mine && r.mine.sharing !== 'private').length],
        ['Kept private by you', myPrivate.length],
      ]}
      momentTitle="Secret Desires"
    >
      <RecapList
        title={`What ${names[partner]} shared`}
        items={sharedByThem.map((r) => (
          <>
            <p className="text-sm text-ink-mute">{r.p.text}</p>
            <p className="mt-0.5 whitespace-pre-line">{r.theirs.text}</p>
          </>
        ))}
      />
      <RecapList
        title="Your private answers (only you can see these)"
        items={myPrivate.map((r) => (
          <>
            <p className="text-sm text-ink-mute">{r.p.text}</p>
            <p className="mt-0.5 whitespace-pre-line">{r.mine!.text}</p>
          </>
        ))}
      />
    </Recap>
  );
}
