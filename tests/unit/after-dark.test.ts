import { describe, expect, it } from 'vitest';
import { TRUTHS } from '../../src/games/after-dark/content/truths';
import { DARES } from '../../src/games/after-dark/content/dares';
import { PICKS } from '../../src/games/after-dark/content/picks';
import { DESIRES } from '../../src/games/after-dark/content/desires';
import { PREDICTIONS } from '../../src/games/after-dark/content/predict';
import { WILDCARDS } from '../../src/games/after-dark/content/wild';
import { DATE_DIMENSIONS, buildConcept } from '../../src/games/after-dark/content/dates';
import { CATEGORIES, allowed, contentCap, type Terms } from '../../src/games/after-dark/content/taxonomy';
import { MODES } from '../../src/games/after-dark/modes';
import { poolFor } from '../../src/games/after-dark/modes/Roulette';

const all = [...TRUTHS, ...DARES, ...DESIRES, ...PICKS.map((p) => ({ ...p, text: `${p.a} / ${p.b}` })), ...PREDICTIONS.map((p) => ({ ...p, text: p.you }))];

describe('After Dark content library', () => {
  it('has substantial original content for every mode', () => {
    expect(MODES).toHaveLength(9);
    expect(TRUTHS.length).toBeGreaterThanOrEqual(48);
    expect(DARES.length).toBeGreaterThanOrEqual(40);
    expect(PICKS.length).toBeGreaterThanOrEqual(40);
    expect(DESIRES.length).toBeGreaterThanOrEqual(24);
    expect(PREDICTIONS.length).toBeGreaterThanOrEqual(20);
    expect(WILDCARDS.length).toBeGreaterThanOrEqual(150);
    expect(DATE_DIMENSIONS).toHaveLength(8);
  });

  it('has no duplicate ids or duplicate prompt texts', () => {
    const ids = all.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const texts = all.map((p) => p.text.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
    expect(new Set(WILDCARDS.map((w) => w.id)).size).toBe(WILDCARDS.length);
  });

  it('labels every prompt with a valid level and category', () => {
    const cats = CATEGORIES.map((c) => c.id);
    for (const p of all) {
      expect([1, 2, 3, 4]).toContain(p.level);
      expect(cats).toContain(p.category);
    }
    for (const lvl of [1, 2, 3, 4]) expect(TRUTHS.some((t) => t.level === lvl)).toBe(true);
  });

  it('never asks for photos, videos or explicit content, and keys are safe', () => {
    for (const p of [...all, ...WILDCARDS]) {
      expect(p.text).not.toMatch(/photo|video|selfie|nude|naked|explicit/i);
      expect(p.id).toMatch(/^[A-Za-z0-9-]+$/);
    }
  });
});

describe('boundaries', () => {
  const terms: Terms = { me_ready: true, partner_ready: true, agreed: true, level: 2, categories: ['flirty', 'romantic'], type: 'mix' };

  it('only allows prompts at or below the agreed level, inside agreed categories', () => {
    const ok = [...TRUTHS, ...DARES].filter((p) => allowed(p, terms));
    expect(ok.length).toBeGreaterThan(0);
    for (const p of ok) {
      expect(p.level).toBeLessThanOrEqual(2);
      expect(['flirty', 'romantic']).toContain(p.category);
    }
    expect(allowed(TRUTHS[0]!, { ...terms, agreed: false })).toBe(false);
  });

  it('older card modes cap content at level 4', () => {
    expect(contentCap(5)).toBe(4);
    expect(contentCap(0)).toBe(1);
  });

  it('roulette pools only contain eligible prompts and respect the content type', () => {
    for (const c of CATEGORIES.map((x) => x.id)) {
      for (const p of poolFor(c, terms)) expect(allowed(p, terms)).toBe(true);
    }
    const questionsOnly: Terms = { ...terms, type: 'questions' };
    for (const p of poolFor('flirty', questionsOnly)) expect(p.id.startsWith('t-')).toBe(true);
    expect(poolFor('kissing', terms)).toEqual([]); // not an agreed category
  });
});

describe('fantasy date builder', () => {
  it('builds a deterministic plan and uses the lower budget', () => {
    const picks = { 1: Object.fromEntries(DATE_DIMENSIONS.map((d) => [d.id, 0])), 2: Object.fromEntries(DATE_DIMENSIONS.map((d) => [d.id, 4])) };
    const names = { 1: 'Pavan', 2: 'Shreya' } as const;
    const a = buildConcept(picks as never, names);
    expect(a).toBe(buildConcept(picks as never, names));
    expect(a).toContain('Budget: free');
    expect(a).toContain("Pavan's pick");
  });
});

describe('stable prompt order', () => {
  it('keeps already-played prompts in place when boundaries change', async () => {
    const { stablePool } = await import('../../src/games/after-dark/shared');
    const items = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));
    const byId = Object.fromEntries(items.map((x) => [x.id, x]));
    // played 'c' then 'a'; new eligible list no longer contains 'a'
    const pool = stablePool([{ id: 'b' }, { id: 'c' }, { id: 'e' }], byId, ['c', 'a'], 4);
    expect(pool.map((x) => x.id)).toEqual(['c', 'a', 'b', 'e']);
  });
});
