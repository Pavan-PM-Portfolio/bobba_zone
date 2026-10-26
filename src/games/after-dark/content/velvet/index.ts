import { BODY } from './body';
import { AROUSAL } from './arousal';
import { PLEASURE } from './pleasure';
import { THEATRE } from './theatre';
import { ATLAS } from './atlas';
import { TALK } from './talk';
import { SECRETS } from './secret';
import { PREDICT } from './predict';
import { VAULT } from './vault';
import type { VItem } from './types';

export * from './types';
export { ATLAS_GROUPS } from './atlas';

export const VELVET: VItem[] = [...BODY, ...AROUSAL, ...PLEASURE, ...THEATRE, ...ATLAS, ...TALK, ...SECRETS, ...PREDICT, ...VAULT];
