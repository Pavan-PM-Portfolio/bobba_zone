import { describe, expect, it } from 'vitest';
import { DESIRE_CATS, DESIRE_QS, LADDER, SCALE, desireById, desirePool, pairVerdict, toggleDesire, validDesire, verdictText } from '../../src/games/after-dark/content/desire';
import { drawDesire, nextStage } from '../../src/games/after-dark/modes/DesireGame';
import { MODES } from '../../src/games/after-dark/modes';

const byCat = (c: string) => DESIRE_QS.filter((q) => q.cat === c);
const ALL = DESIRE_CATS.map((c) => c.id);

describe('Desire Mode library', () => {
  it('is registered as an After Dark mode', () => {
    expect(MODES.map((m) => m.id)).toContain('desire');
  });

  it('has substantial content in every category', () => {
    expect(DESIRE_QS.length).toBeGreaterThanOrEqual(240);
    for (const c of ALL) expect(byCat(c).length, c).toBeGreaterThanOrEqual(20);
    expect(byCat('kink').length).toBeGreaterThanOrEqual(30);
  });

  it('every ladder step maps to real categories, and every category is on the ladder', () => {
    expect(LADDER.map((l) => l.n)).toEqual([1, 2, 3, 4, 5]);
    expect(LADDER.flatMap((l) => l.cats).sort()).toEqual([...ALL].sort());
  });

  it('has unique ids and texts, and safe entry keys', () => {
    const ids = DESIRE_QS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    const texts = DESIRE_QS.map((q) => `${q.text}|${q.setup ?? ''}`.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{1,60}$/);
  });

  it('every question is well formed for its kind', () => {
    for (const q of DESIRE_QS) {
      expect(q.followUp.length, q.id).toBeGreaterThan(5);
      expect([1, 2, 3, 4, 5]).toContain(q.intensity);
      expect(new Set(q.options.map((o) => o.text)).size).toBe(q.options.length);
      if (q.kind === 'scale') {
        expect(q.options).toEqual(SCALE);
        expect(q.cat).toBe('kink');
      } else {
        expect(q.options, q.id).toHaveLength(4);
      }
      if (q.kind === 'predict') expect(q.them, q.id).toContain('{name}');
      if (q.cat === 'two') expect(q.maxPicks).toBe(2);
      expect(q.kind === 'secret').toBe(q.cat === 'secret');
      expect(q.kind === 'predict').toBe(q.cat === 'match');
    }
  });

  it('the interest scale has all five answers, including prefer not to answer', () => {
    expect(SCALE.map((o) => o.text)).toEqual(['Interested', 'Curious', 'Unsure', 'Not interested', 'Prefer not to answer']);
  });

  it('never asks for photos, video, uploads or recordings, and avoids coercive framing', () => {
    for (const q of DESIRE_QS) {
      const all = [q.text, q.them ?? '', q.setup ?? '', q.followUp, ...q.options.map((o) => o.text)].join(' ');
      expect(all, q.id).not.toMatch(/photo|video|selfie|upload|record|film|camera(?! at all)|nude|non-?consensual|against (their|your) will|force|drunk|asleep and|minor|teen|student/i);
    }
  });
});

describe('Desire Mode rules', () => {
  const single = DESIRE_QS.find((q) => q.kind === 'choice' && q.maxPicks === 1)!;
  const two = DESIRE_QS.find((q) => q.maxPicks === 2)!;
  const kink = DESIRE_QS.find((q) => q.kind === 'scale')!;

  it('enforces single choice and "choose up to 2"', () => {
    expect(toggleDesire(single, ['a'], 'b')).toEqual(['b']);
    expect(toggleDesire(two, ['a', 'b'], 'c')).toEqual(['a', 'b']);
    expect(toggleDesire(two, ['a', 'b'], 'a')).toEqual(['b']);
    expect(validDesire(two, ['a', 'b'])).toBe(true);
    expect(validDesire(two, ['a', 'b', 'c'])).toBe(false);
    expect(validDesire(single, [])).toBe(false);
    expect(validDesire(kink, ['pass'])).toBe(true);
    expect(validDesire(kink, ['a'])).toBe(false);
  });

  it('compares answers neutrally and never infers from a pass', () => {
    expect(pairVerdict(single, ['a'], ['a'])).toBe('same');
    expect(pairVerdict(two, ['a', 'b'], ['b', 'c'])).toBe('overlap');
    expect(pairVerdict(single, ['a'], ['b'])).toBe('different');
    expect(pairVerdict(kink, ['yes'], ['curious'])).toBe('both-open');
    expect(pairVerdict(kink, ['yes'], ['no'])).toBe('one-open');
    expect(pairVerdict(kink, ['no'], ['unsure'])).toBe('neither-open');
    expect(pairVerdict(kink, ['pass'], ['yes'])).toBe('pass');
    expect(verdictText('both-open', false)).toMatch(/not agreement/i);
    expect(verdictText('same', false)).toBe('You share this preference.');
    expect(verdictText('different', false)).toBe('You approached this differently.');
  });

  it('only offers categories both players opted into', () => {
    expect(desirePool(undefined, ALL)).toEqual([]);
    expect(desirePool([], ALL)).toEqual([]);
    for (const q of desirePool(['turnons', 'kink'], ALL)) expect(['turnons', 'kink']).toContain(q.cat);
    expect(desirePool(['turnons'], ['kink'])).toEqual([]);
  });

  it('ladder steps advance only to steps with shared topics', () => {
    expect(nextStage(['turnons', 'kink', 'secret'], 0)).toBe(1);
    expect(nextStage(['turnons', 'kink', 'secret'], 1)).toBe(3);
    expect(nextStage(['turnons', 'kink', 'secret'], 3)).toBe(5);
    expect(nextStage(['turnons', 'kink', 'secret'], 5)).toBeNull();
    expect(nextStage(['sensory'], 0)).toBe(2);
  });

  it('draws deterministically and never repeats a question', () => {
    const pool = desirePool(ALL, ALL);
    expect(drawDesire(pool, [], 's:1')?.id).toBe(drawDesire(pool, [], 's:1')?.id);
    const used: string[] = [];
    for (let i = 0; i < pool.length; i++) used.push(drawDesire(pool, used, `s:${i}`)!.id);
    expect(new Set(used).size).toBe(pool.length);
    expect(drawDesire(pool, used, 'x')).toBeNull();
    expect(desireById(used[0]!)).toBeTruthy();
  });
});
