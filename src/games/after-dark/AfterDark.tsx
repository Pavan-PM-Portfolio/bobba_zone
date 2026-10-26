import { lazy, Suspense, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { Pause, SlidersHorizontal, Square } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { FullPageLoader } from '../../components/ui/Spinner';
import { useBusy } from '../flow';
import type { GameProps } from '../types';
import { contentCap, levelTitle, type Terms } from './content/taxonomy';
import { modeById, type ModeId } from './modes';
import { SetupForm, SetupPhase } from './Setup';
import { useTerms } from './shared';

export interface ModeProps extends GameProps {
  terms: Terms;
}

const MODE_COMPONENTS: Record<ModeId, ComponentType<ModeProps>> = {
  truth_dare: lazy(() => import('./modes/TruthOrDare')),
  pick_one: lazy(() => import('./modes/PickOne')),
  desires: lazy(() => import('./modes/SecretDesires')),
  ladder: lazy(() => import('./modes/HeatLadder')),
  roulette: lazy(() => import('./modes/Roulette')),
  knows: lazy(() => import('./modes/KnowsWhom')),
  date: lazy(() => import('./modes/DateBuilder')),
  wild: lazy(() => import('./modes/Wildcards')),
};

export default function AfterDark({ view, s }: GameProps) {
  const { terms, reload } = useTerms(view);
  const mode = modeById(String(view.session.settings.mode ?? 'truth_dare'));
  const started = view.session.state.phase === 'play';
  const completed = view.session.status === 'completed';
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const { busy, run } = useBusy();

  if (!completed && started && terms === null) return <FullPageLoader label="Loading your boundaries" />;
  if (!completed && (!started || !terms?.agreed)) {
    return (
      <SetupPhase
        view={view}
        s={s}
        terms={terms}
        onStart={async () => {
          await s.patch((st) => (st.phase === 'play' ? null : { phase: 'play' }));
          await reload();
        }}
      />
    );
  }
  if (!terms) return <FullPageLoader />;

  const Mode = MODE_COMPONENTS[mode.id];
  return (
    <div>
      {!completed && (
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <mode.icon className="size-4.5 text-accent" aria-hidden="true" />
            <span className="font-medium">{mode.title}</span>
            {terms.agreed && (
              <span className="rounded-[4px] bg-shell px-1.5 py-0.5 text-xs font-medium text-accent-deep">
                Level {contentCap(terms.level ?? 1)}, {levelTitle(terms.level ?? 1)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" icon={<SlidersHorizontal className="size-4" />} onClick={() => setPrefsOpen(true)}>
              Boundaries
            </Button>
            <Link to="/after-dark" className="inline-flex h-9 items-center gap-1.5 rounded-[6px] px-3 text-sm font-semibold text-ink-soft hover:bg-mist hover:text-ink">
              <Pause className="size-4" aria-hidden="true" /> Pause
            </Link>
            <Button size="sm" variant="ghost" icon={<Square className="size-3.5" />} onClick={() => setStopOpen(true)}>
              End
            </Button>
          </div>
        </div>
      )}

      {terms.agreed || completed ? (
        <Suspense fallback={<FullPageLoader />}>
          <Mode view={view} s={s} terms={terms} />
        </Suspense>
      ) : (
        <p className="rounded-[10px] bg-shell px-4 py-3.5 text-ink">
          Your shared boundaries changed and no categories overlap right now. Open Boundaries to adjust, or end the game.
        </p>
      )}

      <Dialog wide open={prefsOpen} onClose={() => setPrefsOpen(false)} title="Your boundaries" actions={<Button variant="secondary" onClick={() => setPrefsOpen(false)}>Close</Button>}>
        <p className="mb-4">Change anything, any time. Lowering your intensity or removing a category applies straight away. Your partner only sees the shared result.</p>
        <SetupForm
          view={view}
          s={s}
          submitLabel="Apply"
          onDone={async () => {
            await reload();
            setPrefsOpen(false);
          }}
        />
      </Dialog>

      <Dialog
        open={stopOpen}
        onClose={() => setStopOpen(false)}
        title="End this game?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setStopOpen(false)}>
              Keep playing
            </Button>
            <Button loading={busy === 'end'} onClick={() => run('end', async () => {
              await s.complete();
              setStopOpen(false);
            })}>
              End and see the recap
            </Button>
          </>
        }
      >
        Either of you can end at any time. No reason needed.
      </Dialog>
    </div>
  );
}
