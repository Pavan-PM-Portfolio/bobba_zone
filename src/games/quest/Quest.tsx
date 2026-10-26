import { useMemo, useState } from 'react';
import { Bookmark, Check, ChevronRight, Flag, SkipForward, Undo2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { ChoiceList, Note, PromptHeading, SaveMoment, TextAnswer } from '../../components/session/Parts';
import { Dialog } from '../../components/ui/Dialog';
import { entriesFor, seatNames } from '../../hooks/useSession';
import { seededShuffle } from '../../lib/random';
import type { PlayerNumber } from '../../lib/types';
import { useBusy, useDraft } from '../flow';
import type { GameProps } from '../types';
import { BUDGETS, CHALLENGES, TIMES, type Budget, type Challenge, type Time } from './content';

type Status = 'saved' | 'done' | 'skipped';
type Prefs = { budget: Budget; time: Time };

export default function Quest({ view, s }: GameProps) {
  const prefs = view.session.state.prefs as Prefs | undefined;
  if (!prefs && view.session.status !== 'completed') return <QuestSetup view={view} s={s} />;
  return <Journey view={view} s={s} prefs={prefs ?? { budget: 2, time: 3 }} />;
}

function QuestSetup({ view, s }: GameProps) {
  const { busy, run } = useBusy();
  const [budget, setBudget] = useState<string>('');
  const [time, setTime] = useState<string>('');
  return (
    <div>
      <PromptHeading eyebrow="Set up your quest">What fits your life right now?</PromptHeading>
      <p className="mt-3 text-ink-soft">Challenges above your budget or time are left out. You can change this later.</p>
      <div className="mt-6 space-y-6">
        <div>
          <p className="mb-2 text-sm font-medium">Budget per challenge</p>
          <ChoiceList label="Budget" options={BUDGETS.map((b) => ({ id: String(b.id), label: b.label, detail: b.detail }))} value={budget || null} onChange={setBudget} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Time per challenge</p>
          <ChoiceList label="Time" options={TIMES.map((t) => ({ id: String(t.id), label: t.label, detail: t.detail }))} value={time || null} onChange={setTime} />
        </div>
        <Button
          size="lg"
          block
          disabled={!budget || !time}
          loading={busy === 'p'}
          onClick={() => run('p', () => s.patch((st) => (st.prefs ? null : { prefs: { budget: Number(budget), time: Number(time) } })))}
        >
          Start the journey
        </Button>
        {view.players.length < 2 && <Note>Your partner can join with the invite code any time.</Note>}
      </div>
    </div>
  );
}

function Journey({ view, s, prefs }: GameProps & { prefs: Prefs }) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const me = view.me.player_number;
  const statuses = (view.session.state.quest ?? {}) as Record<string, Status>;
  const done = view.session.status === 'completed';
  const eligible = useMemo(
    () => seededShuffle(CHALLENGES, view.session.id).filter((c) => c.budget <= prefs.budget && c.time <= prefs.time),
    [view.session.id, prefs.budget, prefs.time],
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'saved' | 'done'>('all');
  const [editPrefs, setEditPrefs] = useState(false);
  const completed = eligible.filter((c) => statuses[c.id] === 'done').length;
  const shown = eligible.filter((c) => (filter === 'all' ? true : statuses[c.id] === filter));
  const open = eligible.find((c) => c.id === openId) ?? null;

  const setStatus = (id: string, st: Status | null) =>
    run(`s-${id}`, () =>
      s.patch((state) => {
        const q = { ...((state.quest ?? {}) as Record<string, Status>) };
        if (st) q[id] = st;
        else delete q[id];
        return { quest: q };
      }),
    );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-[-0.025em]">{done ? 'Your completed quest' : 'Romance Quest'}</h1>
          <p className="mt-1 text-ink-soft">
            {BUDGETS.find((b) => b.id === prefs.budget)?.label} budget, {TIMES.find((t) => t.id === prefs.time)?.label.toLowerCase()} per challenge.
            {!done && (
              <button type="button" onClick={() => setEditPrefs(true)} className="ml-2 font-medium text-accent hover:text-accent-deep">
                Change
              </button>
            )}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[10px] bg-white p-5 shadow-hairline">
        <div className="flex items-baseline justify-between">
          <p className="font-medium">Journey progress</p>
          <p className="tabular text-sm text-ink-soft">
            {completed} of {eligible.length} completed
          </p>
        </div>
        <div className="mt-3 flex gap-1" aria-hidden="true">
          {eligible.map((c) => (
            <span key={c.id} className={`h-1.5 flex-1 rounded-[2px] ${statuses[c.id] === 'done' ? 'bg-accent' : statuses[c.id] === 'saved' ? 'bg-blush' : 'bg-line'}`} />
          ))}
        </div>
      </div>

      <div className="mt-8 flex gap-1 border-b border-line" role="tablist" aria-label="Filter challenges">
        {(['all', 'saved', 'done'] as const).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`-mb-px border-b-2 px-3 pb-2.5 text-sm font-medium ${filter === f ? 'border-accent text-ink' : 'border-transparent text-ink-mute hover:text-ink'}`}
          >
            {f === 'all' ? 'All' : f === 'saved' ? 'Saved for later' : 'Completed'}
          </button>
        ))}
      </div>

      <ol className="mt-4 space-y-2">
        {shown.length === 0 && <li className="py-8 text-center text-ink-mute">{filter === 'saved' ? 'Nothing saved yet.' : 'Nothing completed yet. Pick a challenge to begin.'}</li>}
        {shown.map((c) => {
          const st = statuses[c.id];
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setOpenId(c.id)}
                className={`flex w-full items-center gap-3.5 rounded-[10px] bg-white px-4 py-3.5 text-left shadow-hairline transition-shadow hover:shadow-lift ${st === 'skipped' ? 'opacity-55' : ''}`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full ${
                    st === 'done' ? 'bg-accent text-white' : st === 'saved' ? 'bg-blush text-accent-deep' : 'bg-mist text-ink-mute shadow-hairline'
                  }`}
                  aria-hidden="true"
                >
                  {st === 'done' ? <Check className="size-4" strokeWidth={2.5} /> : st === 'saved' ? <Bookmark className="size-3.5" /> : st === 'skipped' ? <SkipForward className="size-3.5" /> : <Flag className="size-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{c.title}</span>
                  <span className="block text-sm text-ink-mute">
                    {c.kind}, {TIMES.find((t) => t.id === c.time)?.label.toLowerCase()}
                    {st ? `, ${st === 'done' ? 'completed' : st === 'saved' ? 'saved' : 'skipped'}` : ''}
                  </span>
                </span>
                <ChevronRight className="size-4 text-ink-mute" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ol>

      {!done && (
        <div className="mt-10 border-t border-line pt-6">
          <Button variant="secondary" loading={busy === 'fin'} onClick={() => run('fin', () => s.complete())}>
            Finish the quest
          </Button>
          <p className="mt-2 text-sm text-ink-mute">You can leave and come back any time. Finishing closes the journey and keeps it in your history.</p>
        </div>
      )}
      {done && completed > 0 && (
        <div className="mt-8">
          <SaveMoment
            game="quest"
            sessionId={view.session.id}
            defaultTitle={`Romance Quest: ${completed} challenges`}
            defaultBody={eligible.filter((c) => statuses[c.id] === 'done').map((c) => c.title).join('\n')}
          />
        </div>
      )}

      <Dialog open={Boolean(open)} onClose={() => setOpenId(null)} title={open?.title ?? ''} actions={<Button variant="secondary" onClick={() => setOpenId(null)}>Close</Button>}>
        {open && <ChallengeDetail view={view} s={s} c={open} status={statuses[open.id]} names={names} me={me} setStatus={setStatus} readOnly={done} busy={busy} />}
      </Dialog>

      <Dialog
        open={editPrefs}
        onClose={() => setEditPrefs(false)}
        title="Change budget and time"
        actions={<Button variant="secondary" onClick={() => setEditPrefs(false)}>Done</Button>}
      >
        <div className="mt-3 space-y-4">
          <ChoiceList
            label="Budget"
            options={BUDGETS.map((b) => ({ id: String(b.id), label: b.label, detail: b.detail }))}
            value={String(prefs.budget)}
            onChange={(v) => run('pb', () => s.patch((st) => ({ prefs: { ...(st.prefs as Prefs), budget: Number(v) } })))}
          />
          <ChoiceList
            label="Time"
            options={TIMES.map((t) => ({ id: String(t.id), label: t.label, detail: t.detail }))}
            value={String(prefs.time)}
            onChange={(v) => run('pt', () => s.patch((st) => ({ prefs: { ...(st.prefs as Prefs), time: Number(v) } })))}
          />
        </div>
      </Dialog>
    </div>
  );
}

function ChallengeDetail({
  view,
  s,
  c,
  status,
  names,
  me,
  setStatus,
  readOnly,
  busy,
}: GameProps & {
  c: Challenge;
  status?: Status;
  names: Record<PlayerNumber, string>;
  me: PlayerNumber;
  setStatus: (id: string, st: Status | null) => void;
  readOnly: boolean;
  busy: string | null;
}) {
  const { run, busy: b2 } = useBusy();
  const ideas = entriesFor<{ text: string }>(view, `pub:idea:${c.id}`);
  const [draft, setDraft] = useDraft(`idea:${c.id}`, ideas[me]?.payload.text ?? '');
  const doneNote = entriesFor<{ text: string }>(view, `pub:done:${c.id}`);
  const [note, setNote] = useDraft(`done:${c.id}`, '');

  return (
    <div className="mt-2 space-y-5 text-ink">
      <p className="text-ink-soft">{c.brief}</p>

      <div className="space-y-3">
        <p className="text-sm font-medium">{c.ideaPrompt}</p>
        {([1, 2] as PlayerNumber[])
          .filter((seat) => seat !== me && ideas[seat])
          .map((seat) => (
            <div key={seat} className="flex gap-2.5 rounded-[6px] bg-mist p-3">
              <Avatar name={names[seat]} seat={seat} size="xs" />
              <p className="text-sm">{ideas[seat]!.payload.text}</p>
            </div>
          ))}
        {!readOnly && (
          <>
            <TextAnswer label="Your idea" value={draft} onChange={setDraft} max={300} rows={2} placeholder="Your idea" />
            <Button size="sm" variant="secondary" disabled={!draft.trim() || draft.trim() === ideas[me]?.payload.text} loading={b2 === 'idea'} onClick={() => run('idea', () => s.submit(`pub:idea:${c.id}`, { text: draft.trim() }))}>
              {ideas[me] ? 'Update my idea' : 'Share my idea'}
            </Button>
          </>
        )}
      </div>

      {(doneNote[1] || doneNote[2]) && (
        <div className="space-y-2">
          <p className="text-sm font-medium">How it went</p>
          {([1, 2] as PlayerNumber[]).filter((seat) => doneNote[seat]).map((seat) => (
            <p key={seat} className="text-sm text-ink-soft">
              <span className="font-medium text-ink">{seat === me ? 'You' : names[seat]}:</span> {doneNote[seat]!.payload.text}
            </p>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className="space-y-3 border-t border-line pt-4">
          {status === 'done' ? (
            <>
              {!doneNote[me] && (
                <>
                  <TextAnswer label="How did it go?" value={note} onChange={setNote} max={300} rows={2} placeholder="How did it go? (optional)" />
                  {note.trim() && (
                    <Button size="sm" variant="secondary" loading={b2 === 'note'} onClick={() => run('note', () => s.submit(`pub:done:${c.id}`, { text: note.trim() }))}>
                      Save note
                    </Button>
                  )}
                </>
              )}
              <Button size="sm" variant="ghost" icon={<Undo2 className="size-4" />} loading={busy === `s-${c.id}`} onClick={() => setStatus(c.id, null)}>
                Mark as not done
              </Button>
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" icon={<Check className="size-4" />} loading={busy === `s-${c.id}`} onClick={() => setStatus(c.id, 'done')}>
                Mark completed
              </Button>
              <Button size="sm" variant="secondary" icon={<Bookmark className="size-4" />} onClick={() => setStatus(c.id, status === 'saved' ? null : 'saved')}>
                {status === 'saved' ? 'Unsave' : 'Save for later'}
              </Button>
              <Button size="sm" variant="ghost" icon={<SkipForward className="size-4" />} onClick={() => setStatus(c.id, status === 'skipped' ? null : 'skipped')}>
                {status === 'skipped' ? 'Unskip' : 'Skip'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

