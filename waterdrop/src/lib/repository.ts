import type { Observation } from '../types';

/**
 * Storage seam for crew observations. v1 is local-first (IndexedDB via Dexie,
 * implemented in features/crew/db.ts). A later phase swaps in a Supabase-backed
 * implementation of this same interface with no UI rewrite.
 */
export interface ObservationRepository {
  all(): Promise<Observation[]>;
  add(o: Observation): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}
