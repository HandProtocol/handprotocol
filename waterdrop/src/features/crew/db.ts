import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Observation } from '@/types';
import type { ObservationRepository } from '@/lib/repository';
import { useStore } from '@/store';

/**
 * Local-first observation store. Dexie wraps IndexedDB, which persists `Blob`
 * values natively — so the `Photo.blob` field is written and read back as a
 * real Blob with no base64 round-trip. This is the seam that makes capture
 * offline-safe: an observation saved with no network still lands here.
 */
class WaterdropDB extends Dexie {
  observations!: Table<Observation, string>;

  constructor() {
    super('waterdrop');
    // v1 schema: primary key `id`, secondary index on `ts` for newest-first.
    this.version(1).stores({
      observations: 'id, ts',
    });
  }
}

export const db = new WaterdropDB();

/**
 * Dexie-backed implementation of the storage seam. A later phase can swap in a
 * Supabase implementation of this same interface with no UI rewrite.
 */
export const observationRepo: ObservationRepository = {
  all: () => db.observations.toArray(),
  add: async (o) => {
    await db.observations.put(o);
  },
  remove: async (id) => {
    await db.observations.delete(id);
  },
  clear: async () => {
    await db.observations.clear();
  },
};

/** Read all observations newest-first and push them into the shared store. */
export async function loadObservationsIntoStore(): Promise<void> {
  const all = await observationRepo.all();
  all.sort((a, b) => b.ts - a.ts);
  useStore.getState().setObservations(all);
}

/** Persist an observation locally, then refresh the store so the map repaints. */
export async function saveObservation(o: Observation): Promise<void> {
  await observationRepo.add(o);
  await loadObservationsIntoStore();
}

/** Remove an observation locally, then refresh the store. */
export async function deleteObservation(id: string): Promise<void> {
  await observationRepo.remove(id);
  await loadObservationsIntoStore();
}
