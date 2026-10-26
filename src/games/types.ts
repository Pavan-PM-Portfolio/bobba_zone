import type { useSession } from '../hooks/useSession';
import type { SessionView } from '../lib/types';

export type SessionApi = ReturnType<typeof useSession>;

export interface GameProps {
  view: SessionView;
  s: SessionApi;
}
