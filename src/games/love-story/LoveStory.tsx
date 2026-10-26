import { useMemo } from 'react';
import { Star } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Avatar, seatTone } from '../../components/ui/Avatar';
import { AnswerPair, Note, PromptHeading, SaveMoment, StepProgress, TextAnswer, Waiting } from '../../components/session/Parts';
import { entriesFor, partnerHasPending, seatNames } from '../../hooks/useSession';
import type { PlayerNumber } from '../../lib/types';
import { useBusy, useDraft, useJustRevealed, useStep } from '../flow';
import type { GameProps } from '../types';
import { promptsFor, type StoryPrompt } from './content';

type Memory = { text?: string; skipped?: boolean };

export default function LoveStory({ view, s }: GameProps) {
  const chapters = view.session.settings.chapters as string[] | undefined;
  const prompts = useMemo(() => promptsFor(chapters), [chapters]);
  const { step, next } = useStep(view, s);
  if (view.session.status === 'completed' || step >= prompts.length) return <Timeline view={view} s={s} prompts={prompts} />;
  return <MemoryStep key={step} view={view} s={s} p={prompts[step]!} total={prompts.length} onNext={next} />;
}

function MemoryStep({ view, s, p, total, onNext }: GameProps & { p: StoryPrompt; total: number; onNext: () => Promise<boolean> }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner: PlayerNumber = me === 1 ? 2 : 1;
  const key = `seal:m${p.index}`;
  const pair = entriesFor<Memory>(view, key);
  const revealed = Boolean(pair[1] && pair[2]);
  const just = useJustRevealed(key, revealed);
  const [draft, setDraft] = useDraft(key, '');
  const caption = latest(entriesFor<{ text: string }>(view, `pub:cap${p.index}`));
  const [capDraft, setCapDraft] = useDraft(`cap${p.index}`, '');
  const favs = entriesFor<{ on: boolean }>(view, `pub:fav${p.index}`);
  const myFav = Boolean(favs[me]?.payload.on);
  const isLast = p.index + 1 >= total;

  return (
    <div>
      <StepProgress index={p.index} total={total} label={p.chapter.title} />
      <PromptHeading>{p.text}</PromptHeading>

      <div className="mt-6 space-y-4" aria-live="polite">
        {!pair[me] && (
          <>
            <TextAnswer label="Your memory" value={draft} onChange={setDraft} max={600} rows={5} placeholder="Write it the way you remember it." />
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
              <Button size="lg" variant="ghost" loading={busy === 'skip'} onClick={() => run('skip', () => s.submit(key, { skipped: true }))}>
                Skip this one
              </Button>
              <Button size="lg" block className="sm:flex-1" disabled={!draft.trim()} loading={busy === 'save'} onClick={() => run('save', () => s.submit(key, { text: draft.trim() }))}>
                Add my memory
              </Button>
            </div>
            <p className="text-center text-sm text-ink-mute">
              {partnerHasPending(view, key) ? `${names[partner]} has written theirs.` : 'You will both see each other’s memory once you have both written one.'}
            </p>
          </>
        )}

        {pair[me] && !revealed && <Waiting>Saved. Waiting for {names[partner]} to write theirs.</Waiting>}

        {revealed && (
          <div className="space-y-4">
            <AnswerPair
              names={names}
              me={me}
              animate={just}
              render={(seat) =>
                pair[seat]!.payload.skipped ? (
                  <span className="text-ink-mute italic">Skipped</span>
                ) : (
                  <span className="block whitespace-pre-line">{pair[seat]!.payload.text}</span>
                )
              }
            />

            <div className="flex flex-col gap-3 rounded-[10px] bg-mist p-4 shadow-hairline">
              {caption ? (
                <p className="text-sm">
                  <span className="text-ink-mute">Caption: </span>
                  <span className="font-medium">{caption.payload.text}</span>
                </p>
              ) : (
                <div className="flex items-end gap-2">
                  <Field label="Give this memory a caption (optional)" value={capDraft} maxLength={80} onChange={(e) => setCapDraft(e.target.value)} className="flex-1" />
                  <Button variant="secondary" disabled={!capDraft.trim()} loading={busy === 'cap'} onClick={() => run('cap', () => s.submit(`pub:cap${p.index}`, { text: capDraft.trim() }))}>
                    Add
                  </Button>
                </div>
              )}
              <button
                type="button"
                onClick={() => run('fav', () => s.submit(`pub:fav${p.index}`, { on: !myFav }))}
                className="inline-flex w-fit items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink"
                aria-pressed={myFav}
              >
                <Star className={`size-4 ${myFav ? 'fill-accent text-accent' : ''}`} aria-hidden="true" />
                {myFav ? 'One of your favourites' : 'Mark as a favourite'}
              </button>
            </div>

            <Button size="lg" block loading={busy === 'next'} onClick={() => run('next', async () => {
              await onNext();
              if (isLast) await s.complete();
            })}>
              {isLast ? 'See our timeline' : 'Next memory'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function latest<P>(pair: Partial<Record<PlayerNumber, { payload: P; at: string }>>) {
  const xs = [pair[1], pair[2]].filter(Boolean) as { payload: P; at: string }[];
  return xs.sort((a, b) => b.at.localeCompare(a.at))[0];
}

function Timeline({ view, s, prompts }: GameProps & { prompts: StoryPrompt[] }) {
  const names = seatNames(view);
  const me = view.me.player_number;
  const { busy, run } = useBusy();

  if (view.session.status !== 'completed') {
    return (
      <div className="space-y-4">
        <PromptHeading>That was the last prompt.</PromptHeading>
        <Button size="lg" block loading={busy === 'c'} onClick={() => run('c', () => s.complete())}>
          See our timeline
        </Button>
      </div>
    );
  }

  const items = prompts
    .map((p) => {
      const pair = entriesFor<Memory>(view, `seal:m${p.index}`);
      const written = ([1, 2] as PlayerNumber[]).filter((seat) => pair[seat]?.payload.text);
      const favs = entriesFor<{ on: boolean }>(view, `pub:fav${p.index}`);
      return {
        p,
        pair,
        written,
        caption: latest(entriesFor<{ text: string }>(view, `pub:cap${p.index}`))?.payload.text,
        fav: Boolean(favs[1]?.payload.on || favs[2]?.payload.on),
      };
    })
    .filter((x) => x.written.length > 0);

  const chapters = [...new Set(items.map((x) => x.p.chapter.id))];

  return (
    <div>
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.025em]">{view.session.title || 'Our story so far'}</h1>
      <p className="mt-1.5 text-ink-soft">Every memory here is one you wrote. Nothing has been added or changed.</p>

      {items.length === 0 ? (
        <div className="mt-8">
          <Note>You skipped every prompt this time, so there's nothing on the timeline yet.</Note>
        </div>
      ) : (
        <ol className="relative mt-10 space-y-10 border-l border-line pl-6 sm:pl-8">
          {chapters.map((cid) => {
            const group = items.filter((x) => x.p.chapter.id === cid);
            return (
              <li key={cid} className="relative">
                <span className="absolute top-1.5 -left-[29px] size-[9px] rounded-full bg-accent ring-4 ring-paper sm:-left-[37px]" aria-hidden="true" />
                <h2 className="text-sm font-semibold tracking-wide text-accent">{group[0]!.p.chapter.title}</h2>
                <div className="mt-3 space-y-4">
                  {group.map((x) => (
                    <article key={x.p.index} className="rounded-[10px] bg-white p-5 shadow-hairline">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          {x.caption && <h3 className="font-semibold">{x.caption}</h3>}
                          <p className={`${x.caption ? 'mt-0.5 text-sm' : ''} text-ink-mute`}>{x.p.text}</p>
                        </div>
                        {x.fav && <Star className="size-4 shrink-0 fill-accent text-accent" aria-label="Favourite" />}
                      </div>
                      <div className="mt-4 space-y-4">
                        {x.written.map((seat) => (
                          <div key={seat} className="flex gap-3">
                            <Avatar name={names[seat]} seat={seat} size="sm" />
                            <div className="min-w-0">
                              <p className={`text-sm font-medium ${seatTone[seat].text}`}>{seat === me ? 'You' : names[seat]}</p>
                              <p className="reading mt-0.5 whitespace-pre-line text-ink">{x.pair[seat]!.payload.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4">
                        <SaveMoment
                          game="love_story"
                          sessionId={view.session.id}
                          defaultTitle={x.caption || x.p.text}
                          defaultBody={x.written.map((seat) => `${names[seat]}: ${x.pair[seat]!.payload.text}`).join('\n\n')}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
