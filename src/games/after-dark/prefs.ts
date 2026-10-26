import { CATEGORIES, type Category, type ContentType } from './content/taxonomy';

/**
 * Default boundaries remembered on this device, to pre-fill the setup step.
 * These are only defaults: every session asks both players again, and
 * nothing here is ever sent to the partner.
 */
export interface Defaults {
  level: number;
  include: Category[];
  type: ContentType;
}
const KEY = 'between-us:after-dark-defaults';
export const FALLBACK: Defaults = { level: 1, include: CATEGORIES.map((c) => c.id), type: 'mix' };

export function loadDefaults(): Defaults {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Defaults | null;
    return v && Array.isArray(v.include) ? { ...FALLBACK, ...v } : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
export function saveDefaults(d: Defaults) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}
