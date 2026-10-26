import { describe, expect, it } from 'vitest';
import { GAMES } from '../../src/games/registry';
import { KNOW_QUESTIONS } from '../../src/games/know-me/content';
import { STORY_CHAPTERS, promptsFor } from '../../src/games/love-story/content';
import { LEVELS } from '../../src/games/after-hours/content';
import { FUTURE_AREAS, futurePrompts } from '../../src/games/future/content';
import { TRUST_SCENARIOS } from '../../src/games/trust/content';
import { CONFLICT_SCENARIOS, STYLES } from '../../src/games/conflict/content';
import { CHALLENGES } from '../../src/games/quest/content';
import { DECKS, SLOTS, THEMES } from '../../src/games/story/content';
import { seededShuffle } from '../../src/lib/random';

const unique = (xs: string[]) => new Set(xs).size === xs.length;

describe('game catalogue', () => {
  it('has ten distinct games', () => {
    expect(GAMES).toHaveLength(10);
    expect(unique(GAMES.map((g) => g.id))).toBe(true);
  });
});

describe('content integrity', () => {
  it('Know Me: enough unique questions, valid placeholders and options', () => {
    expect(KNOW_QUESTIONS.length).toBeGreaterThanOrEqual(30);
    expect(unique(KNOW_QUESTIONS.map((q) => q.id))).toBe(true);
    for (const q of KNOW_QUESTIONS) {
      expect(q.them).toContain('{name}');
      if (q.options) expect(q.options.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('Love Story: 8 chapters x 3 prompts with stable indexes', () => {
    expect(STORY_CHAPTERS).toHaveLength(8);
    const all = promptsFor(undefined);
    expect(all).toHaveLength(24);
    expect(all.map((p) => p.index)).toEqual([...all.keys()]);
    expect(promptsFor(['first', 'next'])).toHaveLength(6);
  });

  it('After Hours: four levels with at least 10 prompts each', () => {
    expect(LEVELS.map((l) => l.n)).toEqual([1, 2, 3, 4]);
    for (const l of LEVELS) expect(l.prompts.length).toBeGreaterThanOrEqual(10);
  });

  it('Future Together: 8 areas, every prompt has options', () => {
    expect(FUTURE_AREAS).toHaveLength(8);
    expect(futurePrompts().length).toBe(32);
    for (const p of futurePrompts()) expect(p.options.length).toBeGreaterThanOrEqual(3);
  });

  it('Trust and Conflict: scenarios have options, prompts and known styles', () => {
    expect(TRUST_SCENARIOS.length).toBeGreaterThanOrEqual(16);
    expect(unique(TRUST_SCENARIOS.map((s) => s.id))).toBe(true);
    expect(CONFLICT_SCENARIOS.length).toBeGreaterThanOrEqual(14);
    for (const s of CONFLICT_SCENARIOS) {
      expect(s.responses).toHaveLength(4);
      for (const r of s.responses) expect(Object.keys(STYLES)).toContain(r.style);
    }
  });

  it('Romance Quest: challenge ids are safe for entry keys', () => {
    expect(CHALLENGES.length).toBeGreaterThanOrEqual(20);
    for (const c of CHALLENGES) expect(c.id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(unique(CHALLENGES.map((c) => c.id))).toBe(true);
  });

  it('Story Roulette: every theme can deal three choices for every slot', () => {
    for (const t of THEMES) for (const s of SLOTS) expect(DECKS[t.id][s.id].length).toBeGreaterThanOrEqual(3);
  });

  it('shuffles are deterministic, so both devices see the same order', () => {
    expect(seededShuffle(KNOW_QUESTIONS, 'abc').map((q) => q.id)).toEqual(seededShuffle(KNOW_QUESTIONS, 'abc').map((q) => q.id));
    expect(seededShuffle(KNOW_QUESTIONS, 'abc')[0]).not.toBe(undefined);
  });
});
