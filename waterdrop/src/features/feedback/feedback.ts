// Feedback transport. Posts to HAND Protocol's shared feedback function, which
// pins notes into the Command Center (command.feedback_pins) + Telegram + email.
// `source: 'WaterDrop'` labels provenance so it lands under this app. Offline
// notes are queued in localStorage and flushed when back online (river-safe).

const ENDPOINT =
  (import.meta.env.VITE_FEEDBACK_ENDPOINT as string | undefined) ??
  'https://handprotocol.org/.netlify/functions/feedback';

const SOURCE = 'WaterDrop';
const LS_NAME = 'wd-fb-name';
const LS_QUEUE = 'wd-fb-queue';

const SUBSCRIBE_ENDPOINT =
  (import.meta.env.VITE_SUBSCRIBE_ENDPOINT as string | undefined) ??
  '/.netlify/functions/subscribe';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FeedbackInput {
  text: string;
  name?: string;
  tags?: string[];
  region?: string;
}

interface FeedbackPayload {
  text: string;
  path: string;
  title: string;
  name: string;
  source: string;
  tags: string[];
  vw: number | null;
  vh: number | null;
  ua: string;
  ts: number;
  website: string; // honeypot, always empty from real submissions
}

function buildPayload(input: FeedbackInput): FeedbackPayload {
  const tags = [...(input.tags ?? [])];
  if (input.region) tags.push(`region:${input.region}`);
  return {
    text: input.text.trim(),
    path: typeof location !== 'undefined' ? location.pathname || '/' : '/',
    title: `WaterDrop${input.region ? ` · ${input.region}` : ''}`,
    name: (input.name ?? '').trim(),
    source: SOURCE,
    tags,
    vw: typeof window !== 'undefined' ? window.innerWidth : null,
    vh: typeof window !== 'undefined' ? window.innerHeight : null,
    ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : '',
    ts: Date.now(),
    website: '',
  };
}

async function post(payload: FeedbackPayload): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

function loadQueue(): FeedbackPayload[] {
  try {
    return JSON.parse(localStorage.getItem(LS_QUEUE) || '[]');
  } catch {
    return [];
  }
}
function saveQueue(q: FeedbackPayload[]): void {
  try {
    localStorage.setItem(LS_QUEUE, JSON.stringify(q.slice(0, 50)));
  } catch {
    /* storage blocked: drop silently */
  }
}

export function rememberedName(): string {
  try {
    return localStorage.getItem(LS_NAME) || '';
  } catch {
    return '';
  }
}

/** Send a note. Returns 'sent' on success, 'queued' if it was stored for retry. */
export async function sendFeedback(input: FeedbackInput): Promise<'sent' | 'queued'> {
  const name = input.name?.trim();
  if (name) {
    try {
      localStorage.setItem(LS_NAME, name);
    } catch {
      /* ignore */
    }
  }
  const payload = buildPayload(input);
  if (await post(payload)) return 'sent';
  const q = loadQueue();
  if (!q.some((e) => e.ts === payload.ts)) q.push(payload);
  saveQueue(q);
  return 'queued';
}

export type SubscribeResult = 'subscribed' | 'pending' | 'error';

/** Add an email to the WaterDrop updates list (Resend audience via the function). */
export async function subscribeEmail(email: string, name?: string): Promise<SubscribeResult> {
  try {
    const res = await fetch(SUBSCRIBE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        name: (name ?? '').trim(),
        source: SOURCE,
        website: '',
      }),
    });
    if (!res.ok) return 'error';
    const data = (await res.json().catch(() => ({}))) as { status?: string };
    return data.status === 'pending' ? 'pending' : 'subscribed';
  } catch {
    return 'error';
  }
}

/** Retry any queued notes. Safe to call on load, on focus, and on `online`. */
export async function flushFeedbackQueue(): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const q = loadQueue();
  if (!q.length) return;
  const remaining: FeedbackPayload[] = [];
  for (const entry of q) {
    if (!(await post(entry))) remaining.push(entry);
  }
  saveQueue(remaining);
}
