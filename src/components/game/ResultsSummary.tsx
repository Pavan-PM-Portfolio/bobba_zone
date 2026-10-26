import { Avatar } from '../ui/Avatar';
import { finalMessage, roundPercent, roundTitle } from '../../lib/game';
import type { CompletedQuestion, GameResults, PlayerNumber } from '../../lib/types';

export function ResultsSummary({
  results,
  names,
  questions,
}: {
  results: GameResults;
  names: Record<PlayerNumber, string>;
  questions: CompletedQuestion[] | null;
}) {
  const pct = Number(results.agreement_percentage);
  const differences = (questions ?? []).filter((q) => q.status === 'revealed' && q.answers && q.answers.p1 !== q.answers.p2);

  return (
    <div className="space-y-10">
      <section className="rounded-[12px] bg-white p-6 shadow-lift sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-ink-soft">Agreement</p>
            <p className="tabular mt-1 text-[3.5rem] leading-none font-semibold tracking-[-0.04em]">
              {Math.round(pct)}
              <span className="text-[0.45em] text-ink-mute">%</span>
            </p>
            <p className="mt-3 text-ink-soft">
              You agreed on {results.matching_answers} of {results.questions_answered}
              {results.questions_skipped > 0 ? `, and skipped ${results.questions_skipped}` : ''}.
            </p>
          </div>
          <div className="flex -space-x-2">
            <Avatar name={names[1]} seat={1} size="lg" className="rounded-full ring-4 ring-white" />
            <Avatar name={names[2]} seat={2} size="lg" className="rounded-full ring-4 ring-white" />
          </div>
        </div>
        <p className="mt-6 border-t border-line pt-5 text-[1.05rem] text-ink">{finalMessage(pct, results.questions_answered)}</p>
      </section>

      <section aria-labelledby="by-round">
        <h2 id="by-round" className="text-[1.05rem] font-semibold">By round</h2>
        <ul className="mt-3 divide-y divide-line rounded-[10px] bg-white shadow-hairline">
          {results.round_breakdown.map((r) => {
            const rp = roundPercent(r);
            return (
              <li key={r.category} className="px-4 py-3.5 sm:px-5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{roundTitle(r.category)}</span>
                  <span className="tabular text-sm text-ink-soft">{rp === null ? 'All skipped' : `${r.matching} of ${r.answered}`}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-[2px] bg-line" aria-hidden="true">
                  <div className="h-full bg-accent" style={{ width: `${rp ?? 0}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {differences.length > 0 && (
        <section aria-labelledby="diffs">
          <h2 id="diffs" className="text-[1.05rem] font-semibold">This might be worth talking about</h2>
          <ul className="mt-3 divide-y divide-line rounded-[10px] bg-white shadow-hairline">
            {differences.slice(0, 5).map((q) => (
              <li key={q.index} className="px-4 py-4 sm:px-5">
                <p className="font-medium">{q.question_text}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {names[1]} picked {names[q.answers!.p1!]}. {names[2]} picked {names[q.answers!.p2!]}.
                </p>
                {q.discussion_prompt && <p className="mt-2 text-sm text-ink">{q.discussion_prompt}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="rounded-[10px] bg-mist px-4 py-3.5 text-sm text-ink-soft shadow-hairline">
        Agreement shows how similarly you see each other's habits. It doesn't measure love, loyalty or compatibility, and
        picking yourself or your partner never earns extra points.
      </p>
    </div>
  );
}

export function AnswerList({
  questions,
  names,
  notes = [],
}: {
  questions: CompletedQuestion[];
  names: Record<PlayerNumber, string>;
  notes?: { question_index: number; player_number: PlayerNumber; text: string }[];
}) {
  return (
    <ol className="divide-y divide-line rounded-[10px] bg-white shadow-hairline">
      {questions.map((q) => {
        const match = q.answers && q.answers.p1 === q.answers.p2;
        return (
          <li key={q.index} className="px-4 py-3.5 sm:px-5">
            <p className="text-xs text-ink-mute">
              {q.index + 1}. {roundTitle(q.category)}
            </p>
            <p className="mt-0.5 font-medium">{q.question_text}</p>
            {q.status === 'skipped' || !q.answers ? (
              <p className="mt-1 text-sm text-ink-mute">Skipped</p>
            ) : (
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
                <span>
                  {names[1]}: <span className="font-medium text-ink">{names[q.answers.p1!]}</span>
                </span>
                <span>
                  {names[2]}: <span className="font-medium text-ink">{names[q.answers.p2!]}</span>
                </span>
                <span className={`text-xs font-medium ${match ? 'text-success' : 'text-ink-mute'}`}>{match ? 'Agreed' : 'Different'}</span>
              </p>
            )}
            {notes
              .filter((n) => n.question_index === q.index)
              .map((n) => (
                <p key={n.player_number} className="mt-1.5 text-sm text-ink-soft">
                  <span className="font-medium text-ink">{names[n.player_number]}:</span> {n.text}
                </p>
              ))}
          </li>
        );
      })}
    </ol>
  );
}
