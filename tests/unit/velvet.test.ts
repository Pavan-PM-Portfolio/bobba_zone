import { describe, expect, it } from 'vitest';
import { VELVET, VELVET_CATS, VAULT_STAGES, FOLLOW_UPS, PLEASURE_SCALE, ATLAS_SCALE, SHARE_OPTIONS } from '../../src/games/after-dark/content/velvet';
import { TOPIC_CATS, drawVault, drawVelvet, nextVaultStage, searchAtlas, toggleVelvet, validVelvet, velvetPool, velvetVerdict, velvetVerdictText } from '../../src/games/after-dark/content/velvet/logic';
import { MODES } from '../../src/games/after-dark/modes';

const byCat = (c: string) => VELVET.filter((q) => q.cat === c);

describe('VELVET library', () => {
  it('is registered and has at least 300 prewritten items', () => {
    expect(MODES.map((m) => m.id)).toContain('velvet');
    expect(VELVET.length).toBeGreaterThanOrEqual(300);
    for (const c of VELVET_CATS) expect(byCat(c.id).length, c.id).toBeGreaterThanOrEqual(20);
    expect(byCat('atlas').length).toBeGreaterThanOrEqual(80);
  });

  it('has unique ids and texts, and ids that fit entry keys', () => {
    const ids = VELVET.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    const texts = VELVET.map((q) => `${q.text}|${q.setup ?? ''}`.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
    for (const q of VELVET) expect(`pub:xda-${q.id.slice(2)}`).toMatch(/^pub:[A-Za-z0-9:_-]{1,80}$/);
  });

  it('every item is tap-only and well formed', () => {
    for (const q of VELVET) {
      expect(FOLLOW_UPS[q.followUp], q.id).toBeTruthy();
      expect(FOLLOW_UPS[q.followUp].options).toHaveLength(4);
      expect(q.skippable).toBe(true);
      if (q.kind === 'scale') expect(q.options).toEqual(PLEASURE_SCALE);
      else if (q.kind === 'atlas') {
        expect(q.options).toEqual(ATLAS_SCALE);
        expect(q.group && q.tags?.length).toBeTruthy();
      } else expect(q.options, q.id).toHaveLength(4);
      if (q.kind === 'predict') expect(q.them).toContain('{name}');
      expect(q.reveal === 'permission').toBe(['scale', 'atlas', 'secret'].includes(q.kind));
    }
    expect(SHARE_OPTIONS.map((o) => o.id)).toEqual(['together', 'now', 'private']);
  });

  it('keeps hard lines: nothing non-consensual, underage, recorded or involving others', () => {
    for (const q of VELVET) {
      const all = [q.text, q.setup ?? '', q.them ?? '', ...q.options.map((o) => o.text)].join(' ');
      expect(all, q.id).not.toMatch(/student|teacher|school|teen|minor|young girl|young boy|non-?consensual|against (their|your) will|drunk|asleep|photo(?!-free)|video|record|camera(?! at all)|threesome|choke|chok/i);
    }
  });
});

describe('VELVET rules', () => {
  const agreed = [...TOPIC_CATS];
  it('only offers categories both players chose', () => {
    expect(velvetPool(undefined, TOPIC_CATS)).toEqual([]);
    for (const q of velvetPool(['body', 'atlas'], TOPIC_CATS)) expect(['body', 'atlas']).toContain(q.cat);
    expect(velvetPool(agreed, TOPIC_CATS).some((q) => q.cat === 'vault')).toBe(false);
  });

  it('enforces selection limits', () => {
    const two = VELVET.find((q) => q.maxPicks === 2)!;
    const all = VELVET.find((q) => q.maxPicks === 4)!;
    expect(toggleVelvet(two, ['a', 'b'], 'c')).toEqual(['a', 'b']);
    expect(validVelvet(two, ['a', 'b'])).toBe(true);
    expect(validVelvet(two, ['a', 'b', 'c'])).toBe(false);
    let p: string[] = [];
    for (const id of ['a', 'b', 'c', 'd']) p = toggleVelvet(all, p, id);
    expect(p).toHaveLength(4);
  });

  it('describes reveals neutrally and never turns curiosity into agreement', () => {
    const atlas = VELVET.find((q) => q.kind === 'atlas')!;
    const choice = VELVET.find((q) => q.kind === 'choice')!;
    expect(velvetVerdict(atlas, ['yes'], ['curious'])).toBe('mutual');
    expect(velvetVerdict(atlas, ['discuss'], ['yes'])).toBe('discuss');
    expect(velvetVerdict(atlas, ['yes'], ['no'])).toBe('one-open');
    expect(velvetVerdict(atlas, ['private'], ['yes'])).toBe('private');
    expect(velvetVerdict(choice, ['a'], ['a'])).toBe('same');
    expect(velvetVerdict(choice, ['a'], ['b'])).toBe('different');
    expect(velvetVerdictText('mutual', false)).toMatch(/not a yes/i);
  });

  it('searches the Atlas by title, tag and group', () => {
    expect(searchAtlas(VELVET, 'blindfold', null).length).toBeGreaterThanOrEqual(3);
    expect(searchAtlas(VELVET, '', 'Restraint')).toHaveLength(5);
    expect(searchAtlas(VELVET, 'zzz', null)).toEqual([]);
  });

  it('Vault stages need shared categories, and open with their key questions', () => {
    expect(nextVaultStage(['body', 'atlas'], 0)).toBe(1);
    expect(nextVaultStage(['body', 'atlas'], 1)).toBe(5);
    expect(nextVaultStage(['body'], 1)).toBeNull();
    expect(VAULT_STAGES).toHaveLength(5);
    expect(drawVault(agreed, 1, [], 's')?.cat).toBe('vault');
    const used = VELVET.filter((q) => q.cat === 'vault' && q.stage === 1).map((q) => q.id);
    expect(drawVault(agreed, 1, used, 's')?.cat).toBe('body');
  });

  it('draws deterministically without repeats', () => {
    const pool = velvetPool(agreed, TOPIC_CATS);
    expect(drawVelvet(pool, [], 'x')?.id).toBe(drawVelvet(pool, [], 'x')?.id);
    const used: string[] = [];
    for (let i = 0; i < pool.length; i++) used.push(drawVelvet(pool, used, `s${i}`)!.id);
    expect(new Set(used).size).toBe(pool.length);
  });
});
