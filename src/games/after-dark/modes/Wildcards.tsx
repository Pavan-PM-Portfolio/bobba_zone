import { useMemo } from 'react';
import { Shuffle, SkipForward } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Note } from '../../../components/session/Parts';
import { entriesWithPrefix, seatNames } from '../../../hooks/useSession';
import { useBusy } from '../../flow';
import type { ModeProps } from '../AfterDark';
import { allowed, categoryTitle, type Category, type Terms } from '../content/taxonomy';
import { WILDCARDS, isChallengeKind, type Wildcard } from '../content/wild';
import { Recap, RecapList } from '../Recap';
import { FavouriteButton, PromptCard } from '../shared';

type Wild = { n: number; id: string | null; history: string[]; seed: number; cat: Category | 'all'; kind: 'all' | 'question' | 'challenge'; by: number };
const BY_ID: Record<string, Wildcard> = Object.fromEntries(WILDCARDS.map((w) => [w.id, w]));
const KIND_LABEL: Record<Wildcard['kind'], string> = { question: 'Question', choice: 'Choice', scenario: 'Scenario', challenge: 'Challenge', reflection: 'Reflection' };

function deck(terms: Terms, cat: Wild['cat'], kind: Wild['kind']): Wildcard[] {
  return WILDCARDS.filter((w) => {
    if (!allowed(w, terms)) return false;
    if (terms.type === 'questions' && isChallengeKind(w.kind)) return false;
    if (terms.type === 'challenges' && !isChallengeKind(w.kind)) return false;
    if (cat !== 'all' && w.category !== cat) return false;
    if (kind === 'challenge' && !isChallengeKind(w.kind)) return false;
    if (kind === 'question' && isChallengeKind(w.kind)) return false;
    return true;
  });
}

export default function Wildcards({ view, s, terms }: ModeProps) {
  const { busy, run } = useBusy();
  const names = seatNames(view);
  const st = (view.session.state.wild as Wild | undefined) ?? { n: 0, id: null, history: [], seed: 1, cat: 'all', kind: 'all', by: 1 };
  const cards = useMemo(() => deck(terms, st.cat, st.kind), [terms, st.cat, st.kind]);
  const remaining = cards.filter((c) => !st.history.includes(c.id));
  const current = st.id ? BY_ID[st.id] : null;

  if (view.session.status === 'completed') {
    return (
      <Recap view={view} mode="wild" title="Wildcards" stats={[['Cards drawn', st.history.length], ['Favourites', entriesWithPrefix(view, 'pub:fav:').length]]} momentTitle="A night of Wildcards">
        <RecapList title="Cards you played" items={st.history.map((id) => BY_ID[id]?.text ?? '')} />
      </Recap>
    );
  }

  const update = (make: (w: Wild) => Partial<Wild> | null) =>
    s.patch((state) => {
      const w = (state.wild as Wild | undefined) ?? st;
      if (w.n !== st.n) return null;
      const p = make(w);
      return p ? { wild: { ...w, ...p, n: w.n + 1, by: view.me.player_number } } : null;
    });

  const draw = () =>
    run('draw', () =>
      update((w) => {
        const pool = deck(terms, w.cat, w.kind).filter((c) => !w.history.includes(c.id));
        if (!pool.length) return null;
        const pick = pool[Math.floor(Math.random() * pool.length)]!;
        return { id: pick.id, history: [...w.history, pick.id] };
      }),
    );

  const allowedCats = terms.categories ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Category</span>
          <select
            value={st.cat}
            onChange={(e) => run('f', () => update(() => ({ cat: e.target.value as Wild['cat'] })))}
            className="h-9 rounded-[6px] bg-white px-2.5 shadow-[0_0_0_1px_var(--color-line-strong)]"
          >
            <option value="all">All agreed categories</option>
            {allowedCats.map((c) => (
              <option key={c} value={c}>
                {categoryTitle(c)}
              </option>
            ))}
          </select>
        </label>
        {terms.type === 'mix' && (
          <label className="text-sm">
            <span className="mb-1 block font-medium">Type</span>
            <select
              value={st.kind}
              onChange={(e) => run('k', () => update(() => ({ kind: e.target.value as Wild['kind'] })))}
              className="h-9 rounded-[6px] bg-white px-2.5 shadow-[0_0_0_1px_var(--color-line-strong)]"
            >
              <option value="all">Everything</option>
              <option value="question">Questions and choices</option>
              <option value="challenge">Challenges</option>
            </select>
          </label>
        )}
        <p className="tabular ml-auto text-sm text-ink-mute">{remaining.length} cards left in this deck</p>
      </div>

      {current ? (
        <PromptCard
          animateKey={`${st.n}-${current.id}`}
          kicker={`${KIND_LABEL[current.kind]}, ${categoryTitle(current.category)}, drawn by ${names[st.by as 1 | 2]}`}
          aside={<FavouriteButton view={view} s={s} id={current.id} text={current.text} />}
        >
          {current.text}
        </PromptCard>
      ) : (
        <Note>Draw a card to begin. Only cards inside your shared boundaries are in the deck.</Note>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="lg" disabled={!remaining.length} loading={busy === 'draw'} onClick={draw}>
          {current ? 'Next card' : 'Draw a card'}
        </Button>
        {current && (
          <Button size="lg" variant="ghost" icon={<SkipForward className="size-4" />} onClick={draw}>
            Skip
          </Button>
        )}
        <Button size="lg" variant="secondary" icon={<Shuffle className="size-4" />} loading={busy === 'rs'} onClick={() => run('rs', () => update((w) => ({ history: [], id: null, seed: w.seed + 1 })))}>
          Reshuffle
        </Button>
        <Button size="lg" variant="ghost" className="ml-auto" loading={busy === 'end'} onClick={() => run('end', () => s.complete())}>
          Finish
        </Button>
      </div>
      {!remaining.length && <Note tone="pink">You've been through this whole deck. Reshuffle to start again, or change the filters.</Note>}

      {st.history.length > 1 && (
        <details className="rounded-[10px] bg-white shadow-hairline">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">This session's cards ({st.history.length})</summary>
          <ol className="space-y-1.5 border-t border-line px-4 py-3 text-sm text-ink-soft">
            {[...st.history].reverse().map((id) => (
              <li key={id}>{BY_ID[id]?.text}</li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
