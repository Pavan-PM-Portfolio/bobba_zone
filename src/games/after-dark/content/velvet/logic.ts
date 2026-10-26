import { seededShuffle } from '../../../../lib/random';
import { VELVET } from './index';
import { VAULT_STAGES, type VCat, type VItem } from './types';

/** Categories a player can opt into (the Vault is a way to play, not a topic). */
export const TOPIC_CATS: VCat[] = ['body', 'arousal', 'pleasure', 'theatre', 'atlas', 'talk', 'secret', 'predict'];

const BY_ID = new Map(VELVET.map((q) => [q.id, q]));
export const velvetById = (id: string) => BY_ID.get(id);

/** Items in `cats` that both players opted into. */
export function velvetPool(agreed: string[] | undefined, cats: VCat[]): VItem[] {
  if (!agreed?.length) return [];
  return VELVET.filter((q) => q.cat !== 'vault' && cats.includes(q.cat) && agreed.includes(q.cat));
}

export function drawVelvet(pool: VItem[], used: string[], seed: string): VItem | null {
  return seededShuffle(pool.filter((q) => !used.includes(q.id)), seed)[0] ?? null;
}

/** Vault stages that have at least one category both players chose. */
export function vaultStageAvailable(agreed: string[] | undefined, n: number): boolean {
  const st = VAULT_STAGES.find((s) => s.n === n);
  return Boolean(st && velvetPool(agreed, st.cats).length);
}

export function nextVaultStage(agreed: string[] | undefined, from: number): number | null {
  for (const s of VAULT_STAGES) if (s.n > from && vaultStageAvailable(agreed, s.n)) return s.n;
  return null;
}

/** Vault: the stage's key questions first, then its categories. */
export function drawVault(agreed: string[] | undefined, stage: number, used: string[], seed: string): VItem | null {
  const keys = VELVET.filter((q) => q.cat === 'vault' && q.stage === stage && !used.includes(q.id));
  if (keys.length) return keys[0]!;
  const st = VAULT_STAGES.find((s) => s.n === stage);
  return st ? drawVelvet(velvetPool(agreed, st.cats), used, seed) : null;
}

/** Which kinds let the player choose who sees the answer. */
export const needsShare = (q: VItem) => q.reveal === 'permission';

export const OPEN_IDS = ['yes', 'curious', 'discuss'];

export type Verdict = 'same' | 'overlap' | 'different' | 'mutual' | 'discuss' | 'one-open' | 'neither' | 'private';

/** Neutral comparison of two visible answers. Never ranks, never infers. */
export function velvetVerdict(q: VItem, a: string[], b: string[]): Verdict {
  if (q.kind === 'scale' || q.kind === 'atlas') {
    if (a.includes('private') || b.includes('private')) return 'private';
    const oa = OPEN_IDS.includes(a[0] ?? '');
    const ob = OPEN_IDS.includes(b[0] ?? '');
    if (oa && ob) return a.includes('discuss') || b.includes('discuss') ? 'discuss' : 'mutual';
    return oa || ob ? 'one-open' : 'neither';
  }
  const shared = a.filter((x) => b.includes(x));
  if (shared.length === a.length && a.length === b.length) return 'same';
  return shared.length ? 'overlap' : 'different';
}

export function velvetVerdictText(v: Verdict, predictive: boolean): string {
  if (predictive) return v === 'same' ? 'Read like a book. The prediction matched.' : 'Not quite. Now you know.';
  switch (v) {
    case 'same':
      return 'You share this preference.';
    case 'overlap':
      return 'Some of the same, and some different.';
    case 'different':
      return 'You approached this differently.';
    case 'mutual':
      return 'Mutual curiosity. You may want to discuss this one. Curiosity is not a yes; decide together, later.';
    case 'discuss':
      return 'You are both open, after a conversation. Marked for discussion.';
    case 'one-open':
      return 'You approached this differently. Good to know, nothing more.';
    case 'neither':
      return 'Neither of you is drawn to this.';
    case 'private':
      return 'One of you is keeping this private, and that is completely fine.';
  }
}

export function toggleVelvet(q: VItem, picks: string[], id: string): string[] {
  if (!q.options.some((o) => o.id === id)) return picks;
  if (picks.includes(id)) return picks.filter((p) => p !== id);
  if (q.maxPicks === 1) return [id];
  return picks.length >= q.maxPicks ? picks : [...picks, id];
}

export function validVelvet(q: VItem, picks: unknown): picks is string[] {
  if (!Array.isArray(picks) || picks.length < 1 || picks.length > q.maxPicks) return false;
  const ids = new Set(q.options.map((o) => o.id));
  return new Set(picks).size === picks.length && picks.every((p) => typeof p === 'string' && ids.has(p));
}

/** Search the Kink Atlas by title, description, group or tag. */
export function searchAtlas(items: VItem[], query: string, group: string | null): VItem[] {
  const q = query.trim().toLowerCase();
  return items.filter(
    (it) =>
      it.cat === 'atlas' &&
      (!group || it.group === group) &&
      (!q || [it.text, it.setup ?? '', it.group ?? '', ...(it.tags ?? [])].some((s) => s.toLowerCase().includes(q))),
  );
}
