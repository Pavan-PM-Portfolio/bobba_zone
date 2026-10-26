import { Link } from 'react-router-dom';
import { EyeOff, Heart, Link2, Sparkles } from 'lucide-react';
import { Shell } from '../components/ui/Shell';

function SampleCard() {
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
      <div className="absolute -inset-x-3 -bottom-3 top-6 rotate-[-3deg] rounded-[32px] bg-lavender/70" />
      <div className="relative rotate-[1.5deg] rounded-[32px] bg-white p-6 shadow-float ring-1 ring-line">
        <p className="text-sm font-semibold text-lilac-deep">Love & Romance</p>
        <p className="mt-2 font-display text-[1.65rem] leading-[1.15]">Who is more likely to plan a surprise date?</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-blush-soft p-3 ring-2 ring-rose">
            <span className="grid size-10 place-items-center rounded-full bg-blush font-display text-rose-deep">S</span>
            <p className="mt-2 font-semibold">Shreya</p>
            <div className="mt-2 flex -space-x-1.5">
              <span className="grid size-6 place-items-center rounded-full bg-blush text-[0.65rem] font-bold text-rose-deep ring-2 ring-white">S</span>
              <span className="grid size-6 place-items-center rounded-full bg-lavender text-[0.65rem] font-bold text-lilac-deep ring-2 ring-white">P</span>
            </div>
          </div>
          <div className="rounded-2xl bg-shell p-3">
            <span className="grid size-10 place-items-center rounded-full bg-lavender font-display text-lilac-deep">P</span>
            <p className="mt-2 font-semibold">Pavan</p>
          </div>
        </div>
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-rose-deep">
          <Heart className="size-4 fill-current" /> You both picked Shreya
        </p>
      </div>
    </div>
  );
}

const steps = [
  { icon: Link2, title: 'Invite your partner', body: 'Share a private link or an 8-character code. Each of you plays on your own phone.' },
  { icon: EyeOff, title: 'Answer in secret', body: "Pick who's more likely. Your partner can't see your choice, or even if you changed it." },
  { icon: Sparkles, title: 'Reveal together', body: 'Once you have both locked in, the answers appear on both screens at the same moment.' },
];

export default function Welcome() {
  return (
    <Shell wide>
      <section className="grid items-center gap-12 pt-6 md:grid-cols-[1.1fr_1fr] md:pt-14">
        <div>
          <p className="text-[0.95rem] font-semibold text-rose-deep">Couples edition</p>
          <h1 className="mt-3 font-display text-[2.6rem] leading-[1.04] tracking-[-0.01em] text-balance sm:text-[3.6rem]">
            How well do you really know each other?
          </h1>
          <p className="mt-5 max-w-[34rem] text-lg text-ink-soft">
            A two-player game of playful predictions. Answer the same questions about each other in private, then see
            where you agree and where you're happily surprised.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/create"
              className="inline-flex h-14 items-center justify-center rounded-full bg-ink px-8 font-semibold text-paper shadow-lift transition-colors hover:bg-[#2a3060]"
            >
              Create a game
            </Link>
            <Link
              to="/join"
              className="inline-flex h-14 items-center justify-center rounded-full bg-white px-8 font-semibold text-ink ring-1 ring-line transition-shadow hover:ring-ink/30"
            >
              Join a game
            </Link>
          </div>
        </div>
        <SampleCard />
      </section>

      <section aria-labelledby="how" className="mt-20 md:mt-28">
        <h2 id="how" className="font-display text-3xl">
          How it works
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-[24px] bg-white/80 p-5 ring-1 ring-line">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-ink font-display text-paper">{i + 1}</span>
                <s.icon className="size-5 text-lilac-deep" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-ink-soft">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-2xl text-ink-mute">
          Your score shows how similarly you see each other's habits. It isn't a measure of love, loyalty or
          compatibility, just a fun excuse to talk.
        </p>
      </section>
    </Shell>
  );
}
