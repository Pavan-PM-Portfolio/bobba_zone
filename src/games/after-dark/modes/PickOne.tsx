import { useMemo } from 'react';
import { Check } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Avatar, seatTone } from '../../../components/ui/Avatar';
import { Note, StepProgress, TextAnswer, Waiting } from '../../../components/session/Parts';
import { entriesFor, partnerHasPending, seatNames } from '../../../hooks/useSession';
import { seededShuffle } from '../../../lib/random';
import type { PlayerNumber } from '../../../lib/types';
import { useBusy, useDraft, useJustRevealed, useStep } from '../../flow';
import type { ModeProps } from '../AfterDark';
import { PACKS, PICKS, type Pick } from '../content/picks';
import { allowed } from '../content/taxonomy';
import { Recap, RecapList } from '../Recap';
import { FavouriteButton, playedIds, stablePool } from '../shared';

const ROUNDS = 10;
type Choice = { c: 0 | 1; id?: string };
const BY_ID: Record<string, Pick> = Object.fromEntries(PICKS.map((p) => [p.id, p]));

export default function PickOne({ view, s, terms }: ModeProps) {
  const played = playedIds(view, (i) => `seal:pk${i}`, ROUNDS);
  const pool = useMemo(
    () => stablePool(seededShuffle(PICKS.filter((p) => allowed(p, terms)), view.session.id), BY_ID, played, ROUNDS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view.session.id, terms, played.join('|')],
  );
  const { step, next } = useStep(view, s);
  if (view.session.status === 'completed' || (pool.length > 0 && step >= pool.length)) return <PickRecap view={view} s={s} terms={terms} pool={pool} />;
  if (!pool.length) return <Note tone="pink">No choices match your shared boundaries yet. Open Boundaries to include more categories.</Note>;
  return <PickRound key={step} view={view} s={s} terms={terms} p={pool[step]!} i={step} total={pool.length} onNext={next} />;
}

function PickRound({ view, s, p, i, total, onNext }: ModeProps & { p: Pick; i: number; total: number; onNext: () => Promise<boolean> }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner: PlayerNumber = me === 1 ? 2 : 1;
  const key = `seal:pk${i}`;
  const pair = entriesFor<Choice>(view, key);
  const revealed = Boolean(pair[1] && pair[2]);
  const just = useJustRevealed(key, revealed);
  const [sel, setSel] = useDraft<number | null>(key, null);
  const why = entriesFor<{ text: string }>(view, `pub:pw${i}`);
  const [whyDraft, setWhyDraft] = useDraft(`pw${i}`, '');
  const pack = PACKS.find((x) => x.id === p.pack)?.title;
  const options = [p.a, p.b];
  const matched = revealed && pair[1]!.payload.c === pair[2]!.payload.c;

  return (
    <div className="space-y-6">
      <StepProgress index={i} total={total} label={`Pick One, ${pack}`} />
      <div className="flex items-center justify-between">
        <h1 className="text-[1.45rem] font-semibold tracking-[-0.02em]">Which do you prefer?</h1>
        <FavouriteButton view={view} s={s} id={p.id} text={`${p.a} or ${p.b}?`} />
      </div>

      <div className="relative grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Your pick">
        {options.map((label, idx) => {
          const mine = pair[me]?.payload.c === idx;
          const selected = !pair[me] ? sel === idx : mine && !revealed;
          const voters = revealed ? ([1, 2] as PlayerNumber[]).filter((seat) => pair[seat]!.payload.c === idx) : [];
          return (
            <button
              key={idx}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={Boolean(pair[me])}
              onClick={() => setSel(idx)}
              className={`flex min-h-36 flex-col justify-between rounded-[12px] p-5 text-left transition-[box-shadow,background-color,transform] duration-200 ${
                selected || voters.length
                  ? 'bg-shell shadow-[0_0_0_2px_var(--color-accent)]'
                  : 'bg-white shadow-lift hover:-translate-y-0.5 hover:shadow-float disabled:hover:translate-y-0'
              } disabled:cursor-default`}
            >
              <span className="text-[1.2rem] leading-snug font-semibold tracking-[-0.01em]">{label}</span>
              <span className="mt-4 flex items-center justify-between">
                <span className="flex -space-x-1.5">
                  {voters.map((v, k) => (
                    <span key={v} className={just ? 'animate-land' : ''} style={just ? { animationDelay: `${120 + k * 160}ms` } : undefined}>
                      <Avatar name={names[v]} seat={v} size="sm" className="rounded-full ring-2 ring-white" />
                    </span>
                  ))}
                </span>
                {selected && <span className="grid size-6 place-items-center rounded-full bg-accent text-white"><Check className="size-3.5" strokeWidth={3} /></span>}
              </span>
            </button>
          );
        })}
      </div>

      {!pair[me] && (
        <>
          <Button size="lg" block disabled={sel === null} loading={busy === 'lock'} onClick={() => run('lock', () => s.submit(key, { c: sel as 0 | 1, id: p.id }))}>
            Lock in my pick
          </Button>
          <p className="text-center text-sm text-ink-mute">{partnerHasPending(view, key) ? `${names[partner]} has picked.` : `${names[partner]} can't see your pick until you both lock in.`}</p>
        </>
      )}
      {pair[me] && !revealed && <Waiting>Locked in. Waiting for {names[partner]}.</Waiting>}

      {revealed && (
        <div className="animate-rise space-y-4">
          <p className={`text-[1.05rem] font-medium ${matched ? 'text-accent-deep' : 'text-ink'}`}>
            {matched ? 'Same pick. You agreed on this one.' : 'Different picks. Worth a conversation: what would make each option perfect?'}
          </p>
          {([1, 2] as PlayerNumber[])
            .filter((seat) => why[seat])
            .map((seat) => (
              <p key={seat} className="text-sm">
                <span className={`font-medium ${seatTone[seat].text}`}>{seat === me ? 'You' : names[seat]}: </span>
                {why[seat]!.payload.text}
              </p>
            ))}
          {!why[me] && (
            <div className="space-y-2">
              <TextAnswer label="Why that one" value={whyDraft} onChange={setWhyDraft} max={240} rows={2} placeholder="Why that one? (optional)" />
              {whyDraft.trim() && (
                <Button size="sm" variant="secondary" loading={busy === 'why'} onClick={() => run('why', () => s.submit(`pub:pw${i}`, { text: whyDraft.trim() }))}>
                  Share
                </Button>
              )}
            </div>
          )}
          <Button size="lg" block loading={busy === 'next'} onClick={() => run('next', async () => {
            await onNext();
            if (i + 1 >= total) await s.complete();
          })}>
            {i + 1 >= total ? 'See the recap' : 'Next pair'}
          </Button>
        </div>
      )}
    </div>
  );
}

function PickRecap({ view, s, pool }: ModeProps & { pool: Pick[] }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  if (view.session.status !== 'completed') {
    return (
      <Button size="lg" block loading={busy === 'c'} onClick={() => run('c', () => s.complete())}>
        See the recap
      </Button>
    );
  }
  const rows = pool.map((p, i) => ({ p, pair: entriesFor<Choice>(view, `seal:pk${i}`) })).filter((r) => r.pair[1] && r.pair[2]);
  const same = rows.filter((r) => r.pair[1]!.payload.c === r.pair[2]!.payload.c);
  const diff = rows.filter((r) => r.pair[1]!.payload.c !== r.pair[2]!.payload.c);
  const opt = (p: Pick, c: number) => (c === 0 ? p.a : p.b);
  return (
    <Recap
      view={view}
      mode="pick_one"
      title="Pick One"
      stats={[
        ['Pairs played', rows.length],
        ['Same pick', same.length],
        ['Different pick', diff.length],
        ['Favourites', view.entries.filter((e) => e.key.startsWith('pub:fav:')).length],
      ]}
      momentTitle="What we both picked"
      momentBody={same.map((r) => opt(r.p, r.pair[1]!.payload.c)).join('\n')}
    >
      <RecapList title="Shared preferences" items={same.map((r) => <span className="font-medium">{opt(r.p, r.pair[1]!.payload.c)}</span>)} />
      <RecapList
        title="Interesting differences"
        items={diff.map((r) => (
          <>
            <p className="text-sm text-ink-mute">
              {r.p.a} or {r.p.b}?
            </p>
            <p className="mt-0.5 text-sm">
              {([me, me === 1 ? 2 : 1] as PlayerNumber[]).map((seat) => `${seat === me ? 'You' : names[seat]}: ${opt(r.p, r.pair[seat]!.payload.c)}`).join('. ')}
            </p>
          </>
        ))}
      />
    </Recap>
  );
}
