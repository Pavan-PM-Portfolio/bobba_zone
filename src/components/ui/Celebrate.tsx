import { useEffect, useMemo, useRef } from 'react';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** A small cluster of hearts that float up once. Used on a matching reveal. */
export function HeartBurst({ count = 7 }: { count?: number }) {
  const hearts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: 15 + ((i * 71) % 70),
        dx: ((i * 37) % 60) - 30,
        rot: ((i * 53) % 50) - 25,
        delay: i * 90,
        size: 14 + ((i * 7) % 12),
        color: i % 2 ? '#D2557A' : '#7A68C9',
      })),
    [count],
  );
  if (prefersReducedMotion()) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
      {hearts.map((h, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="absolute bottom-6 animate-float-heart"
          style={
            {
              left: `${h.left}%`,
              width: h.size,
              height: h.size,
              animationDelay: `${h.delay}ms`,
              '--dx': `${h.dx}px`,
              '--rot': `${h.rot}deg`,
            } as React.CSSProperties
          }
        >
          <path
            fill={h.color}
            d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 4.2 2.4.6-1.3 2.1-2.4 4.2-2.4 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z"
          />
        </svg>
      ))}
    </div>
  );
}

/** Lightweight canvas confetti in the brand colours. Runs once, ~2.5s. */
export function Confetti({ fire }: { fire: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!fire || prefersReducedMotion()) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    const colors = ['#D2557A', '#F6C9D5', '#7A68C9', '#D9D0F6', '#1C2147'];
    const pieces = Array.from({ length: 140 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.3,
      y: canvas.height * 0.35,
      vx: (Math.random() - 0.5) * 14 * dpr,
      vy: (-Math.random() * 14 - 6) * dpr,
      w: (6 + Math.random() * 6) * dpr,
      h: (8 + Math.random() * 8) * dpr,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)]!,
    }));
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = Math.max(0, 1 - elapsed / 2600);
      for (const p of pieces) {
        p.vy += 0.35 * dpr;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (elapsed < 2600) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [fire]);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-40 h-full w-full" aria-hidden="true" />;
}
