import { useStore } from '@/store';

/**
 * Crew identity (local-first, v1). Stewardship is open: any paddler can join
 * the crew on their own device by entering a name. No shared passcode. Their
 * observations are authored under that name (and optional group label). Real
 * multi-device accounts + sync arrive with the database phase.
 */
const UNLOCK_KEY = 'wd-crew-unlocked';
const NAME_KEY = 'wd-crew-name';
const TEAM_KEY = 'wd-crew-team';

/** True once this device has joined the crew (kept across exits). */
export function isUnlocked(): boolean {
  try {
    return localStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

/** Join the crew under a name (and optional group/team label). */
export function joinCrew(name: string, team?: string): void {
  const n = name.trim();
  const t = (team ?? '').trim();
  try {
    localStorage.setItem(UNLOCK_KEY, '1');
    if (n) localStorage.setItem(NAME_KEY, n);
    if (t) localStorage.setItem(TEAM_KEY, t);
    else localStorage.removeItem(TEAM_KEY);
  } catch {
    /* storage unavailable; identity is in-memory this session only */
  }
}

/** The crew member's name for authoring observations; falls back to 'Crew'. */
export function crewName(): string {
  try {
    return localStorage.getItem(NAME_KEY)?.trim() || 'Crew';
  } catch {
    return 'Crew';
  }
}

/** Optional group/team label the crew member entered. */
export function crewTeam(): string {
  try {
    return localStorage.getItem(TEAM_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

/** Step out of crew mode. Clears the join flag so reload returns to the public
    view; the name is kept so re-joining just needs one tap. */
export function lock(): void {
  try {
    localStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* ignore */
  }
  useStore.getState().setCrewMode(false);
}
