import { useMemo, useState } from 'react';
import { PenLine } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Avatar } from '../../components/ui/Avatar';
import { useToast } from '../../components/ui/Toast';
import { ChoiceList, PromptHeading, SaveMoment, StepProgress, TextAnswer, Waiting } from '../../components/session/Parts';
import { entriesFor, seatNames } from '../../hooks/useSession';
import { api } from '../../lib/api';
import { toAppError } from '../../lib/errors';
import { seededShuffle } from '../../lib/random';
import type { PlayerNumber, SessionView } from '../../lib/types';
import { useBusy, useDraft } from '../flow';
import type { GameProps } from '../types';
import { DECKS, SLOTS, THEMES, type Theme } from './content';

type Turn = { pick: string; line?: string };
const chooserFor = (turn: number): PlayerNumber => (turn % 2 === 0 ? 1 : 2);

function paragraphs(view: SessionView) {
  const out: { n: number; seat: PlayerNumber; text: string; line?: string }[] = [];
  SLOTS.forEach((slot, n) => {
    const e = entriesFor<Turn>(view, `pub:turn${n}`)[chooserFor(n)];
    if (e) out.push({ n, seat: chooserFor(n), text: slot.template(e.payload.pick), line: e.payload.line });
  });
  return out;
}

function StoryText({ view, showAuthors }: { view: SessionView; showAuthors?: boolean }) {
  const names = seatNames(view);
  const paras = paragraphs(view);
  if (paras.length === 0) return <p className="text-ink-mute">The first page is still blank.</p>;
  return (
    <div className="reading space-y-4 text-ink">
      {paras.map((p) => (
        <p key={p.n}>
          {p.text}
          {p.line && <> {p.line}</>}
          {showAuthors && (
            <span className="ml-1.5 align-middle font-sans text-xs text-ink-mute" title={`Chosen by ${names[p.seat]}`}>
              ({names[p.seat]})
            </span>
          )}
        </p>
      ))}
    </div>
  );
}

export default function Story({ view, s }: GameProps) {
  const theme = (view.session.settings.theme as Theme) ?? 'romance';
  const turn = Number(view.session.state.turn ?? 0);
  if (view.session.status === 'completed') return <FinishedStory view={view} s={s} theme={theme} />;
  if (turn >= SLOTS.length) return <NameStory view={view} s={s} theme={theme} />;
  return <TurnView key={turn} view={view} s={s} theme={theme} turn={turn} />;
}

function TurnView({ view, s, theme, turn }: GameProps & { theme: Theme; turn: number }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const chooser = chooserFor(turn);
  const slot = SLOTS[turn]!;
  const options = useMemo(() => seededShuffle(DECKS[theme][slot.id], `${view.session.id}:${turn}`).slice(0, 3), [view.session.id, theme, slot.id, turn]);
  const [pick, setPick] = useDraft<string>(`p${turn}`, '');
  const [line, setLine] = useDraft(`l${turn}`, '');
  const mine = chooser === me;

  return (
    <div>
      <StepProgress index={turn} total={SLOTS.length} label={`${THEMES.find((t) => t.id === theme)?.title} story`} />
      <div className="mt-7 flex items-center gap-2.5 text-sm text-ink-soft">
        <Avatar name={names[chooser]} seat={chooser} size="sm" />
        {mine ? <span><span className="font-medium text-ink">Your turn:</span> {slot.label.toLowerCase()}</span> : <span>{names[chooser]} is choosing the {slot.label.toLowerCase()}</span>}
      </div>

      {mine ? (
        <>
          <PromptHeading>{slot.ask}</PromptHeading>
          <div className="mt-6 space-y-4">
            <ChoiceList label={slot.label} options={options.map((o) => ({ id: o, label: slot.id === 'ending' ? o : o.charAt(0).toUpperCase() + o.slice(1) }))} value={pick || null} onChange={setPick} />
            <div>
              <p className="mb-1.5 text-sm font-medium">Add a line of your own (optional)</p>
              <TextAnswer label="Your line" value={line} onChange={setLine} max={200} rows={2} placeholder="A sentence that adds your voice to this part of the story" />
            </div>
            <Button
              size="lg"
              block
              disabled={!pick}
              loading={busy === 'go'}
              onClick={() =>
                run('go', async () => {
                  await s.submit(`pub:turn${turn}`, { pick, ...(line.trim() ? { line: line.trim() } : {}) });
                  await s.patch((st) => (Number(st.turn ?? 0) === turn ? { turn: turn + 1 } : null));
                })
              }
            >
              {turn + 1 === SLOTS.length ? 'Write the ending' : 'Add to the story'}
            </Button>
          </div>
        </>
      ) : (
        <div className="mt-6">
          <Waiting>Your turn comes next. You can read along below.</Waiting>
        </div>
      )}

      <section className="mt-10 border-t border-line pt-6">
        <p className="mb-3 text-sm font-medium text-ink-mute">The story so far</p>
        <StoryText view={view} />
      </section>
    </div>
  );
}

function NameStory({ view, s, theme }: GameProps & { theme: Theme }) {
  const { busy, run } = useBusy();
  const [title, setTitle] = useState('');
  return (
    <div>
      <PromptHeading eyebrow="The End">Give your story a title.</PromptHeading>
      <div className="mt-6 space-y-4">
        <Field label="Title" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Something only the two of you would understand" />
        <Button size="lg" block disabled={!title.trim()} loading={busy === 't'} onClick={() => run('t', () => s.complete(title.trim()))}>
          Finish and read it
        </Button>
      </div>
      <section className="mt-10 border-t border-line pt-6">
        <p className="mb-3 text-sm font-medium text-ink-mute">{THEMES.find((t) => t.id === theme)?.title} story</p>
        <StoryText view={view} />
      </section>
    </div>
  );
}

function FinishedStory({ view, s, theme }: GameProps & { theme: Theme }) {
  const toast = useToast();
  const names = seatNames(view);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(view.session.title ?? '');
  const [busy, setBusy] = useState(false);
  const [authors, setAuthors] = useState(false);
  const text = paragraphs(view)
    .map((p) => `${p.text}${p.line ? ` ${p.line}` : ''}`)
    .join('\n\n');

  async function rename() {
    setBusy(true);
    try {
      await api.renameSession(view.session.id, title.trim());
      await s.refresh();
      setEditing(false);
    } catch (e) {
      toast(toAppError(e).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="mx-auto max-w-[36rem]">
      <p className="text-center text-sm text-ink-mute">
        A {THEMES.find((t) => t.id === theme)?.title.toLowerCase()} story by {names[1]} and {names[2]}
      </p>
      {editing ? (
        <div className="mt-4 flex items-end gap-2">
          <Field label="Title" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} className="flex-1" />
          <Button disabled={!title.trim()} loading={busy} onClick={rename}>
            Save
          </Button>
        </div>
      ) : (
        <h1 className="reading mt-3 text-center !text-[2.2rem] !leading-tight font-semibold tracking-[-0.01em] text-balance">{view.session.title || 'Untitled'}</h1>
      )}
      <div className="mx-auto my-8 h-px w-16 bg-accent" aria-hidden="true" />
      <StoryText view={view} showAuthors={authors} />
      <div className="mx-auto mt-10 h-px w-16 bg-line" aria-hidden="true" />
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Button size="sm" variant="secondary" icon={<PenLine className="size-4" />} onClick={() => setEditing(true)}>
          Rename
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setAuthors((a) => !a)} aria-pressed={authors}>
          {authors ? 'Hide who chose what' : 'Show who chose what'}
        </Button>
        <SaveMoment game="story" sessionId={view.session.id} defaultTitle={view.session.title || 'Our story'} defaultBody={text} />
      </div>
    </article>
  );
}
