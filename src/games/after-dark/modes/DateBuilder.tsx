import { useState } from 'react';
import { Bookmark, Check } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { Note, TextAnswer, Waiting } from '../../../components/session/Parts';
import { entriesFor, partnerHasPending, seatNames } from '../../../hooks/useSession';
import { api } from '../../../lib/api';
import { toAppError } from '../../../lib/errors';
import type { PlayerNumber } from '../../../lib/types';
import { useBusy, useDraft, useJustRevealed } from '../../flow';
import type { ModeProps } from '../AfterDark';
import { DATE_DIMENSIONS, buildConcept } from '../content/dates';
import { Recap } from '../Recap';

type Picks = { picks: Record<string, number> };

export default function DateBuilder({ view, s, terms }: ModeProps) {
  const { busy, run } = useBusy();
  const toast = useToast();
  const names = seatNames(view);
  const me = view.me.player_number;
  const partner: PlayerNumber = me === 1 ? 2 : 1;
  const key = 'seal:fd';
  const pair = entriesFor<Picks>(view, key);
  const revealed = Boolean(pair[1] && pair[2]);
  const just = useJustRevealed(key, revealed);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const plans = entriesFor<{ text: string }>(view, 'pub:plan');
  const latestPlan = [plans[1], plans[2]].filter(Boolean).sort((a, b) => b!.at.localeCompare(a!.at))[0];
  const concept = revealed ? buildConcept({ 1: pair[1]!.payload.picks, 2: pair[2]!.payload.picks }, names) : '';
  const [plan, setPlan] = useDraft(`plan:${latestPlan?.at ?? 'none'}`, latestPlan?.payload.text ?? concept);
  const [saved, setSaved] = useState(false);
  const complete = Object.keys(picks).length === DATE_DIMENSIONS.length;

  if (view.session.status === 'completed') {
    return (
      <Recap view={view} mode="date" title="Fantasy Date Builder" stats={[['Choices each', DATE_DIMENSIONS.length], ['Matching choices', revealed ? DATE_DIMENSIONS.filter((d) => pair[1]!.payload.picks[d.id] === pair[2]!.payload.picks[d.id]).length : 0]]} momentTitle="Our fantasy date" momentBody={latestPlan?.payload.text ?? concept}>
        <article className="reading rounded-[10px] bg-white p-6 whitespace-pre-line shadow-hairline">{latestPlan?.payload.text ?? concept}</article>
      </Recap>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em]">Design your fantasy date</h1>
        <p className="mt-1 text-ink-soft">Choose privately. When you have both finished, your picks are combined into one plan.</p>
      </div>

      {!pair[me] && (
        <>
          <div className="space-y-5">
            {DATE_DIMENSIONS.map((d) => (
              <fieldset key={d.id}>
                <legend className="mb-2 text-sm font-medium">{d.label}</legend>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={d.label}>
                  {d.options.map((o, j) => (
                    <button
                      key={o}
                      type="button"
                      role="radio"
                      aria-checked={picks[d.id] === j}
                      onClick={() => setPicks((p) => ({ ...p, [d.id]: j }))}
                      className={`rounded-[6px] px-3 py-2 text-sm ${picks[d.id] === j ? 'bg-shell font-medium text-accent-deep shadow-[0_0_0_1.5px_var(--color-accent)]' : 'bg-white shadow-[0_0_0_1px_var(--color-line-strong)] hover:bg-mist'}`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <Button size="lg" block disabled={!complete} loading={busy === 'l'} onClick={() => run('l', () => s.submit(key, { picks }))}>
            Lock in my date
          </Button>
          <p className="text-center text-sm text-ink-mute">
            {complete ? '' : `${DATE_DIMENSIONS.length - Object.keys(picks).length} choices left. `}
            {partnerHasPending(view, key) ? `${names[partner]} has finished theirs.` : ''}
          </p>
        </>
      )}
      {pair[me] && !revealed && <Waiting>Locked in. Waiting for {names[partner]} to design theirs.</Waiting>}

      {revealed && (
        <>
          <div className={`overflow-hidden rounded-[10px] bg-white shadow-hairline ${just ? 'animate-flip' : ''}`}>
            <table className="w-full text-left text-sm">
              <thead className="bg-mist text-ink-mute">
                <tr>
                  <th className="px-4 py-2.5 font-medium" scope="col"></th>
                  <th className="px-4 py-2.5 font-medium" scope="col">{me === 1 ? 'You' : names[1]}</th>
                  <th className="px-4 py-2.5 font-medium" scope="col">{me === 2 ? 'You' : names[2]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {DATE_DIMENSIONS.map((d) => {
                  const a = pair[1]!.payload.picks[d.id] ?? 0;
                  const b = pair[2]!.payload.picks[d.id] ?? 0;
                  return (
                    <tr key={d.id}>
                      <th scope="row" className="px-4 py-2.5 font-medium">{d.label}</th>
                      <td className="px-4 py-2.5">{d.options[a]}</td>
                      <td className="px-4 py-2.5">
                        {d.options[b]} {a === b && <Check className="ml-1 inline size-3.5 text-success" aria-label="Match" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <section className="space-y-3">
            <h2 className="font-semibold">Your combined plan</h2>
            <p className="text-sm text-ink-mute">Built from both sets of picks. Edit anything; the latest version is shared with both of you.</p>
            <TextAnswer label="Date plan" value={plan} onChange={setPlan} max={1500} rows={9} />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={!plan.trim() || plan === latestPlan?.payload.text} loading={busy === 'p'} onClick={() => run('p', () => s.submit('pub:plan', { text: plan.trim() }))}>
                Save edits
              </Button>
              <Button
                icon={saved ? <Check className="size-4" /> : <Bookmark className="size-4" />}
                loading={busy === 'idea'}
                onClick={() =>
                  run('idea', async () => {
                    try {
                      await api.saveMoment({ game: 'after_dark', title: 'Date idea for later', body: plan.trim(), sessionId: view.session.id });
                      setSaved(true);
                      toast('Saved to your favourites and memories.', 'success');
                    } catch (e) {
                      toast(toAppError(e).message, 'error');
                    }
                  })
                }
              >
                {saved ? 'Saved for later' : 'Save as a date idea'}
              </Button>
              <Button variant="ghost" loading={busy === 'end'} onClick={() => run('end', () => s.complete())}>
                Finish
              </Button>
            </div>
          </section>
          {terms.type === 'questions' ? null : <Note>The plan is a starting point. Change or drop anything that doesn't suit you both.</Note>}
        </>
      )}
    </div>
  );
}
