import { BODY } from './body';
import { AROUSAL } from './arousal';
import { PLEASURE } from './pleasure';
import { THEATRE } from './theatre';
import { ATLAS } from './atlas';
import { TALK } from './talk';
import { SECRETS } from './secret';
import { PREDICT } from './predict';
import { VAULT } from './vault';
import { THEATRE_HEAT, AROUSAL_HEAT, ATLAS_HEAT, SECRETS_HEAT } from './heat';
import type { VItem } from './types';

export * from './types';

export const VELVET: VItem[] = [...BODY, ...AROUSAL, ...AROUSAL_HEAT, ...PLEASURE, ...THEATRE, ...THEATRE_HEAT, ...ATLAS, ...ATLAS_HEAT, ...TALK, ...SECRETS, ...SECRETS_HEAT, ...PREDICT, ...VAULT];

export const ATLAS_GROUPS = [...new Set(VELVET.filter((q) => q.cat === 'atlas').map((q) => q.group!))];
