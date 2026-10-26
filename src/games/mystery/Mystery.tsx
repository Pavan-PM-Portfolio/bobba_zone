import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Lightbulb, LockKeyhole, Pin, StickyNote, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Avatar, seatTone } from '../../components/ui/Avatar';
import { FullPageLoader } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { ChoiceList, Note, SaveMoment, SectionTitle, TextAnswer } from '../../components/session/Parts';
import { entriesWithPrefix, seatNames } from '../../hooks/useSession';
import { api } from '../../lib/api';
import { toAppError } from '../../lib/errors';
import type { MysteryView, PlayerNumber } from '../../lib/types';
import { useBusy, useDraft } from '../flow';
import type { GameProps } from '../types';

type BoardNote = { text: string; title?: string; chapter: number };
const newKey = () => `pub:board:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export default function Mystery({ view, s }: GameProps) {
  const toast = useToast();
  const [m, setM] = useState<MysteryView | null>(null);
  const load = useCallback(async () => {
    try {
      setM(await api.mystery(view.session.id));
    } catch (e) {
      toast(toAppError(e).message, 'error');
    }
  }, [view.session.id, toast]);
  useEffect(() => {
    void load();
  }, [load, view.session.state_version]);

  // If the case was solved on the other device, close the session here too.
  useEffect(() => {
    if (m?.solved && view.session.status === 'in_progress') void s.complete(m.case.title).catch(() => {});
  }, [m?.solved, m?.case.title, view.session.status, s]);

  if (!m) return <FullPageLoader label="Opening the case file" />;
  if (m.solved) return <Solved view={view} s={s} m={m} />;
  return <Investigation view={view} s={s} m={m} reload={load} />;
}

function Investigation({ view, s, m, reload }: GameProps & { m: MysteryView; reload: () => Promise<void> }) {
  const toast = useToast();
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner: PlayerNumber = me === 1 ? 2 : 1;
  const current = m.chapters.find((c) => c.no === m.chapter)!;
  const earlier = m.chapters.filter((c) => c.no < m.chapter);
  const board = entriesWithPrefix<BoardNote>(view, 'pub:board:');
  const [answer, setAnswer] = useDraft<string>(`ans${m.chapter}`, '');
  const [note, setNote] = useDraft(`note${m.chapter}`, '');
  const [feedback, setFeedback] = useState<string | null>(null);
  const sharedTitles = new Set(board.filter((b) => b.player_number === me).map((b) => b.payload.title));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-accent">
          Chapter {m.chapter} of {m.total_chapters}
        </p>
        <h1 className="mt-1 text-[1.75rem] font-semibold tracking-[-0.025em]">{m.case.title}</h1>
        {m.chapter === 1 && <p className="mt-2 leading-relaxed text-ink-soft">{m.case.intro}</p>}
      </header>

      {earlier.length > 0 && (
        <details className="rounded-[10px] bg-white shadow-hairline">
          <summary className="cursor-pointer px-5 py-3.5 text-sm font-medium">Solved chapters ({earlier.length})</summary>
          <ol className="space-y-3 border-t border-line px-5 py-4">
            {earlier.map((c) => (
              <li key={c.no}>
                <p className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="size-4 text-success" aria-hidden="true" /> {c.title}
                </p>
                <p className="mt-0.5 text-sm text-ink-soft">{c.resolution}</p>
              </li>
            ))}
          </ol>
        </details>
      )}

      <section>
        <h2 className="text-lg font-semibold tracking-[-0.01em]">{current.title}</h2>
        <p className="mt-1.5 leading-relaxed text-ink-soft">{current.scene}</p>
      </section>

      <section>
        <SectionTitle aside={<span className="inline-flex items-center gap-1.5 text-xs text-ink-mute"><LockKeyhole className="size-3.5" /> Only you can see these</span>}>
          Your clues
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {current.my_clues.map((c) => (
            <article key={c.no} className="flex flex-col rounded-[10px] border border-line bg-[#fffdf8] p-4">
              <p className="text-xs font-semibold tracking-wide text-ink-mute">{c.title}</p>
              <p className="mt-1.5 flex-1 text-ink">{c.body}</p>
              <button
                type="button"
                disabled={sharedTitles.has(c.title) || busy !== null}
                onClick={() => run(`sh${c.no}`, () => s.submit(newKey(), { text: c.body, title: c.title, chapter: m.chapter }))}
                className="mt-3 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-deep disabled:text-ink-mute"
              >
                <Pin className="size-3.5" aria-hidden="true" />
                {sharedTitles.has(c.title) ? 'On the board' : 'Pin to shared board'}
              </button>
            </article>
          ))}
          <div className="grid place-items-center rounded-[10px] border border-dashed border-line-strong p-4 text-center">
            <p className="text-sm text-ink-soft">
              {names[partner]} holds {current.partner_clue_count} {current.partner_clue_count === 1 ? 'clue' : 'clues'} you can't see.
              <br />
              Ask them, or wait for them to pin.
            </p>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>Shared board</SectionTitle>
        <div className="rounded-[10px] bg-mist p-4 shadow-hairline">
          {board.length === 0 ? (
            <p className="py-3 text-center text-sm text-ink-mute">Pinned clues and notes appear here for both of you.</p>
          ) : (
            <ul className="space-y-2.5">
              {board.map((b) => (
                <li key={b.key} className="flex gap-3 rounded-[6px] bg-white p-3 shadow-hairline">
                  <Avatar name={names[b.player_number]} seat={b.player_number} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-medium ${seatTone[b.player_number].text}`}>
                      {b.player_number === me ? 'You' : names[b.player_number]}
                      {b.payload.title ? `, pinned "${b.payload.title}"` : ', note'}
                      <span className="font-normal text-ink-mute"> (chapter {b.payload.chapter})</span>
                    </p>
                    <p className="mt-0.5 text-sm">{b.payload.text}</p>
                  </div>
                  {b.player_number === me && (
                    <button type="button" onClick={() => run('rm', () => s.remove(b.key))} className="self-start text-ink-mute hover:text-ink" aria-label="Remove from board">
                      <X className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex items-start gap-2">
            <div className="flex-1">
              <TextAnswer label="Add a note" value={note} onChange={setNote} max={240} rows={1} placeholder="Add a theory or note" />
            </div>
            <Button variant="secondary" icon={<StickyNote className="size-4" />} disabled={!note.trim()} loading={busy === 'note'} onClick={() => run('note', async () => {
              await s.submit(newKey(), { text: note.trim(), chapter: m.chapter });
              setNote('');
            })}>
              Add
            </Button>
          </div>
        </div>
      </section>

      {current.hints.length > 0 && (
        <section>
          <SectionTitle>Hints</SectionTitle>
          <ul className="space-y-2">
            {current.hints.map((h, i) => (
              <li key={i} className="flex gap-2.5 rounded-[6px] bg-white px-4 py-3 text-sm shadow-hairline">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                {h}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-[10px] bg-white p-5 shadow-lift">
        <h2 className="font-semibold">{current.question}</h2>
        <p className="mt-0.5 text-sm text-ink-mute">One answer for both of you. Agree before you submit.</p>
        <div className="mt-4">
          <ChoiceList label={current.question} options={current.options.map((o) => ({ id: o.id, label: o.label }))} value={answer || null} onChange={(v) => { setAnswer(v); setFeedback(null); }} />
        </div>
        {feedback && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {feedback}
          </p>
        )}
        <div className="mt-4 flex flex-col-reverse gap-2.5 sm:flex-row">
          {current.hints.length < current.hints_available && (
            <Button variant="ghost" icon={<Lightbulb className="size-4" />} loading={busy === 'hint'} onClick={() => run('hint', async () => {
              await api.mysteryHint(view.session.id);
              await s.refresh();
              await reload();
            })}>
              Use a hint ({current.hints_available - current.hints.length} left)
            </Button>
          )}
          <Button
            block
            size="lg"
            className="sm:flex-1"
            disabled={!answer}
            loading={busy === 'ans'}
            onClick={() =>
              run('ans', async () => {
                const r = await api.mysteryAnswer(view.session.id, answer);
                await s.refresh();
                await reload();
                if (r.solved) {
                  await s.complete(m.case.title);
                } else if (r.correct) {
                  toast('Correct. On to the next chapter.', 'success');
                } else {
                  setFeedback('Not quite. Compare your clues again: neither of you can solve this alone.');
                }
              })
            }
          >
            Submit our answer
          </Button>
        </div>
        {current.attempts > 0 && <p className="tabular mt-3 text-xs text-ink-mute">Attempts on this chapter: {current.attempts}</p>}
      </section>
    </div>
  );
}

function Solved({ view, m }: GameProps & { m: MysteryView }) {
  const attempts = m.chapters.reduce((n, c) => n + c.attempts, 0);
  const hints = m.chapters.reduce((n, c) => n + c.hints.length, 0);
  return (
    <div className="space-y-8">
      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          <CheckCircle2 className="size-4" aria-hidden="true" /> Case solved
        </p>
        <h1 className="mt-1 text-[1.75rem] font-semibold tracking-[-0.025em]">{m.case.title}</h1>
      </div>
      <article className="reading rounded-[10px] bg-white p-6 shadow-hairline sm:p-8">{m.case.ending}</article>
      <div className="grid grid-cols-3 gap-3">
        {[
          ['Chapters', m.total_chapters],
          ['Answers tried', attempts],
          ['Hints used', hints],
        ].map(([l, n]) => (
          <div key={l as string} className="rounded-[10px] bg-white p-4 shadow-hairline">
            <p className="tabular text-2xl font-semibold">{n}</p>
            <p className="text-sm text-ink-soft">{l}</p>
          </div>
        ))}
      </div>
      <section>
        <SectionTitle>How you solved it</SectionTitle>
        <ol className="space-y-3">
          {m.chapters.map((c) => (
            <li key={c.no} className="rounded-[10px] bg-white p-4 shadow-hairline">
              <p className="font-medium">
                {c.no}. {c.title}
              </p>
              <p className="mt-1 text-sm text-ink-soft">{c.resolution}</p>
            </li>
          ))}
        </ol>
      </section>
      {view.session.status !== 'completed' && <Note>Wrapping up the case.</Note>}
      <SaveMoment game="mystery" sessionId={view.session.id} defaultTitle={`We solved ${m.case.title}`} defaultBody={`Solved in ${attempts} answers with ${hints} hints.`} />
    </div>
  );
}
