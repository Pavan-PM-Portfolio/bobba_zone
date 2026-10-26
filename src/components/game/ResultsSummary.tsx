import { Heart, MessageCircleHeart } from 'lucide-react';
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
    <div className="space-y-8">
      <section className="rounded-[32px] bg-white p-6 text-center shadow-float ring-1 ring-line sm:p-8">
        <div className="flex justify-center -space-x-3">
          <Avatar name={names[1]} seat={1} size="lg" className="ring-4 ring-white rounded-full" />
          <Avatar name={names[2]} seat={2} size="lg" className="ring-4 ring-white rounded-full" />
        </div>
        <p className="mt-5 font-display text-[4.5rem] leading-none tracking-tight sm:text-[5.5rem]">
          {Math.round(pct)}
          <span className="text-[0.55em] text-ink-mute">%</span>
        </p>
        <p className="mt-2 text-lg font-semibold">mutual agreement</p>
        <p className="mt-1 text-ink-soft">
          You matched on {results.matching_answers} of {results.questions_answered} questions
          {results.questions_skipped > 0 ? ` and skipped ${results.questions_skipped}` : ''}.
        </p>
        <p className="mx-auto mt-5 max-w-sm font-display text-xl leading-snug text-balance">
          {finalMessage(pct, results.questions_answered)}
        </p>
      </section>

      <section aria-labelledby="by-round">
        <h2 id="by-round" className="font-display text-2xl">
          By round
        </h2>
        <ul className="mt-4 space-y-3">
          {results.round_breakdown.map((r) => {
            const rp = roundPercent(r);
            return (
              <li key={r.category} className="rounded-2xl bg-white p-4 ring-1 ring-line">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{roundTitle(r.category)}</span>
                  <span className="text-sm text-ink-soft">
                    {rp === null ? 'All skipped' : `${r.matching} of ${r.answered} matched`}
                  </span>
                </div>
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
                  <div className="h-full rounded-full bg-rose" style={{ width: `${rp ?? 0}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {differences.length > 0 && (
        <section aria-labelledby="diffs">
          <h2 id="diffs" className="font-display text-2xl">
            Worth talking about
          </h2>
          <p className="mt-1 text-ink-soft">Moments where you saw things differently.</p>
          <ul className="mt-4 space-y-3">
            {differences.slice(0, 4).map((q) => (
              <li key={q.index} className="rounded-2xl bg-lavender-soft p-4">
                <p className="font-semibold">{q.question_text}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {names[1]} picked {names[q.answers!.p1!]}, {names[2]} picked {names[q.answers!.p2!]}.
                </p>
                {q.discussion_prompt && (
                  <p className="mt-2 flex gap-2 text-ink">
                    <MessageCircleHeart className="mt-0.5 size-4 shrink-0 text-lilac-deep" aria-hidden="true" />
                    {q.discussion_prompt}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="flex gap-2 rounded-2xl bg-shell p-4 text-sm text-ink-soft">
        <Heart className="mt-0.5 size-4 shrink-0 text-rose" aria-hidden="true" />
        Agreement shows how similarly you see each other's habits. It doesn't measure love, loyalty, compatibility or
        how good your relationship is. Picking yourself or your partner never earns extra points.
      </p>
    </div>
  );
}

export function AnswerList({ questions, names }: { questions: CompletedQuestion[]; names: Record<PlayerNumber, string> }) {
  return (
    <ol className="space-y-2.5">
      {questions.map((q) => {
        const match = q.answers && q.answers.p1 === q.answers.p2;
        return (
          <li key={q.index} className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <p className="text-sm text-ink-mute">
              {q.index + 1}. {roundTitle(q.category)}
            </p>
            <p className="mt-0.5 font-semibold">{q.question_text}</p>
            {q.status === 'skipped' || !q.answers ? (
              <p className="mt-1.5 text-sm text-ink-mute">Skipped</p>
            ) : (
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span>
                  {names[1]}: <strong>{names[q.answers.p1!]}</strong>
                </span>
                <span>
                  {names[2]}: <strong>{names[q.answers.p2!]}</strong>
                </span>
                <span className={`font-semibold ${match ? 'text-rose-deep' : 'text-lilac-deep'}`}>{match ? 'Matched' : 'Different'}</span>
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
