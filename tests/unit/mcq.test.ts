import { describe, expect, it } from 'vitest';
import {
  ALL_MCQ,
  DECKS,
  THEME_FOLLOW_UPS,
  compare,
  followUpFor,
  mcqById,
  mcqPool,
  pickLabel,
  togglePick,
  validPicks,
  type Mcq,
} from '../../src/games/after-dark/content/mcq';
import { CATEGORIES, type Terms } from '../../src/games/after-dark/content/taxonomy';
import { drawNext } from '../../src/games/after-dark/modes/QuestionGame';

const byDeck = (d: string) => ALL_MCQ.filter((q) => q.deck === d);
const byLevelCore = (n: number) => ALL_MCQ.filter((q) => q.level === n && !['cinematic', 'mind', 'two'].includes(q.deck));
const terms: Terms = { me_ready: true, partner_ready: true, agreed: true, level: 5, categories: CATEGORIES.map((c) => c.id), type: 'mix' };

describe('Question Game library', () => {
  it('meets the content targets', () => {
    for (const n of [1, 2, 3, 4, 5]) expect(byLevelCore(n).length, `level ${n}`).toBeGreaterThanOrEqual(40);
    expect(byDeck('cinematic').length).toBeGreaterThanOrEqual(30);
    expect(byDeck('mind').length).toBeGreaterThanOrEqual(30);
    expect(byDeck('two').length).toBeGreaterThanOrEqual(30);
    for (const d of DECKS) expect(byDeck(d.id).length, d.id).toBeGreaterThan(0);
  });

  it('has unique ids, unique question texts and safe entry keys', () => {
    const ids = ALL_MCQ.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    const texts = ALL_MCQ.map((q) => (q.scene ? q.scene.situation : q.text).toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
    for (const id of ids) expect(`pub:fav:${id}`).toMatch(/^pub:[A-Za-z0-9:_-]{1,80}$/);
  });

  it('every question has four distinct options with themes and full metadata', () => {
    for (const q of ALL_MCQ) {
      expect(q.options, q.id).toHaveLength(4);
      expect(new Set(q.options.map((o) => o.text)).size, q.id).toBe(4);
      expect(q.options.map((o) => o.id)).toEqual(['a', 'b', 'c', 'd']);
      for (const o of q.options) {
        expect(THEME_FOLLOW_UPS[o.theme], `${q.id} theme ${o.theme}`).toBeTruthy();
        expect(o.text.trim().length).toBeGreaterThan(1);
      }
      expect(CATEGORIES.map((c) => c.id)).toContain(q.category);
      expect([1, 2, 3, 4, 5]).toContain(q.level);
      expect([1, 2, 4]).toContain(q.maxPicks);
      expect(q.followUp.length).toBeGreaterThan(5);
      expect(q.reveal).toBe('simultaneous');
      expect(q.skippable).toBe(true);
      expect(q.kind).toBe(q.deck === 'mind' ? 'predictive' : 'independent');
    }
  });

  it('multi-select only appears in Choose Two, and every Choose Two question is multi-select', () => {
    for (const q of ALL_MCQ) {
      if (q.deck === 'two') expect(q.maxPicks).toBeGreaterThan(1);
      else expect(q.maxPicks).toBe(1);
    }
  });

  it('cinematic scenes have all three beats, predictive questions name the answerer', () => {
    for (const q of byDeck('cinematic')) {
      expect(q.scene?.setting && q.scene.atmosphere && q.scene.situation, q.id).toBeTruthy();
    }
    for (const q of byDeck('mind')) expect(q.them, q.id).toContain('{name}');
  });

  it('never asks for photos, videos or explicit content', () => {
    for (const q of ALL_MCQ) {
      const all = [q.text, q.them ?? '', q.followUp, ...q.options.map((o) => o.text), ...Object.values(q.scene ?? {})].join(' ');
      expect(all, q.id).not.toMatch(/photo|video|selfie|nude|naked|explicit|sext/i);
    }
  });
});

describe('selection rules', () => {
  const single = ALL_MCQ.find((q) => q.maxPicks === 1)!;
  const two = ALL_MCQ.find((q) => q.maxPicks === 2)!;
  const all = ALL_MCQ.find((q) => q.maxPicks === 4)!;

  it('labels multi-select questions clearly', () => {
    expect(pickLabel(single)).toBeNull();
    expect(pickLabel(two)).toBe('Choose up to 2');
    expect(pickLabel(all)).toBe('Select all that apply');
  });

  it('single choice replaces, up-to-two stops at two, select-all allows four', () => {
    expect(togglePick(single, ['a'], 'b')).toEqual(['b']);
    expect(togglePick(single, ['a'], 'a')).toEqual([]);
    let p = togglePick(two, [], 'a');
    p = togglePick(two, p, 'c');
    expect(togglePick(two, p, 'd')).toEqual(['a', 'c']);
    expect(togglePick(two, p, 'a')).toEqual(['c']);
    let q: string[] = [];
    for (const id of ['a', 'b', 'c', 'd']) q = togglePick(all, q, id);
    expect(q).toHaveLength(4);
    expect(togglePick(single, [], 'z')).toEqual([]);
  });

  it('validates answers before they are locked', () => {
    expect(validPicks(single, ['a'])).toBe(true);
    expect(validPicks(single, [])).toBe(false);
    expect(validPicks(single, ['a', 'b'])).toBe(false);
    expect(validPicks(two, ['a', 'b'])).toBe(true);
    expect(validPicks(two, ['a', 'a'])).toBe(false);
    expect(validPicks(all, ['a', 'b', 'c', 'd'])).toBe(true);
    expect(validPicks(single, ['x'])).toBe(false);
    expect(validPicks(single, 'a')).toBe(false);
  });

  it('compares answers into shared and unique choices', () => {
    expect(compare(['a'], ['a'])).toMatchObject({ same: true, shared: ['a'] });
    expect(compare(['a', 'b'], ['b', 'c'])).toEqual({ shared: ['b'], onlyA: ['a'], onlyB: ['c'], same: false });
    expect(compare(['b', 'a'], ['a', 'b']).same).toBe(true);
  });

  it('follow-ups are based only on the option chosen', () => {
    const q = ALL_MCQ.find((x) => x.deck === 'fantasy')!;
    const opt = q.options[2]!;
    expect(followUpFor(q, [opt.id])).toBe(THEME_FOLLOW_UPS[opt.theme]);
    expect(followUpFor(two, ['a', 'b'])).toBe(two.followUp);
    const m = ALL_MCQ.find((x) => x.deck === 'mind')!;
    expect(followUpFor(m, ['a'])).toBe(m.followUp);
  });
});

describe('boundaries and levels', () => {
  it('never offers a question above the agreed level or outside shared categories', () => {
    const narrow: Terms = { ...terms, level: 2, categories: ['flirty', 'kissing'] };
    const pool = mcqPool(narrow, DECKS.map((d) => d.id), 5);
    expect(pool.length).toBeGreaterThan(0);
    for (const q of pool) {
      expect(q.level).toBeLessThanOrEqual(2);
      expect(['flirty', 'kissing']).toContain(q.category);
    }
  });

  it('the in-game level caps the pool even when boundaries allow more', () => {
    for (const q of mcqPool(terms, DECKS.map((d) => d.id), 1)) expect(q.level).toBe(1);
  });

  it('returns nothing until both partners have agreed', () => {
    expect(mcqPool({ ...terms, agreed: false }, ['fantasy'], 5)).toEqual([]);
  });

  it('respects deck selection', () => {
    for (const q of mcqPool(terms, ['cinematic'], 5)) expect(q.deck).toBe('cinematic');
  });

  it('draws deterministically, prefers the current level and never repeats', () => {
    const pool = mcqPool(terms, DECKS.map((d) => d.id), 3);
    const a = drawNext(pool, [], 3, 'seed:0');
    const b = drawNext(pool, [], 3, 'seed:0');
    expect(a?.id).toBe(b?.id);
    expect(a?.level).toBe(3);
    const used: string[] = [];
    for (let i = 0; i < pool.length; i++) {
      const q = drawNext(pool, used, 3, `seed:${i}`) as Mcq;
      expect(used).not.toContain(q.id);
      used.push(q.id);
    }
    expect(drawNext(pool, used, 3, 'seed:x')).toBeNull();
  });

  it('looks up questions by id', () => {
    expect(mcqById(ALL_MCQ[0]!.id)).toBe(ALL_MCQ[0]);
    expect(mcqById('nope')).toBeUndefined();
  });
});
