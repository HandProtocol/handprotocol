/* Review helper — shared core.

   One POST endpoint behind a PIN, two actions:

     { action:'unlock', pin }                         → 200 { ok, business:{ name, links[], chips[] } }
                                                        401 { ok:false, error }   wrong PIN
     { action:'draft', pin, mode, notes, draft,       → 200 application/x-ndjson, one JSON object per line:
       tone, length }                                     {"t":"text","v":"…"}   a piece of the draft, in order
                                                          {"t":"need_more"}      the notes had nothing to work with
                                                          {"t":"error","v":"…"}  it failed part-way
                                                          {"t":"done"}           always last on success
                                                        4xx/5xx { ok:false, error } when it fails before any text

   What it is: a writing aid for a REAL guest. The guest types a few notes about
   their own visit; Claude turns those notes into a draft the guest edits and posts
   under their own name. The prompt forbids adding anything the guest did not say,
   and keeps criticism in — so every draft is as true, and as different, as the
   notes behind it. A per-request style card (random opening + shape) keeps two
   guests with similar notes from getting similar text.

   This file has no site- or engine-specific imports on purpose: the SAME file ships
   in longhornwinetours (netlify/functions/lib/) and in the HAND client-site engine
   (clients/_template/netlify/functions/lib/). Fix it in one, copy it to the other.

   The PIN is a courtesy gate (two digits, said out loud to every guest), not a
   secret. What actually bounds spend is the platform rate limit on the route and a
   spend limit on the API key's workspace. */

import crypto from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-5';
const MAX_TOKENS = 2000;                 // draft + any thinking; a draft is ~60–180 tokens
const REQUEST_TIMEOUT_MS = 25000;
const MAX_BODY_BYTES = 16 * 1024;

export const LIMITS = { notesMin: 12, notesMinWords: 3, notesMax: 600, draftMax: 2000, pinMax: 8 };
export const TONES = ['casual', 'warm', 'playful', 'plain'];
export const LENGTHS = ['short', 'fuller'];
// draft = notes → a first draft · retake = same notes, a different draft
// shorter / casual = rework the draft in the box · polish = fix typos only, add nothing
export const MODES = ['draft', 'retake', 'shorter', 'casual', 'polish'];
const NEEDS_NOTES = new Set(['draft', 'retake']);
const NEEDS_DRAFT = new Set(['retake', 'shorter', 'casual', 'polish']);
const SENTINEL = 'NEED_MORE';

const TONE_LINES = {
  casual: 'relaxed and conversational, like a text to a friend',
  warm: 'warm and appreciative, without gushing',
  playful: 'light and a little funny, if the notes give you something to be funny about',
  plain: 'plain and to the point, no flourishes',
};
const LENGTH_LINES = {
  short: '2 or 3 sentences',
  fuller: '4 to 6 sentences',
};
const OPENINGS = [
  'open with the moment that stood out most',
  'open with who they came with or why they came',
  'open with a plain verdict, then back it up',
  'open mid-story, the way you would tell a friend about it',
  'open with what they would tell someone who is thinking about booking',
];
// Shape follows length: nobody writes two paragraphs out of two sentences.
const SHAPES = {
  short: ['one flowing paragraph', 'a few short, punchy sentences'],
  fuller: ['one flowing paragraph', 'two short paragraphs', 'a few short, punchy sentences, then one longer one'],
};

// ---------------------------------------------------------------- business

const cleanStr = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);

function cleanLink(l) {
  if (!l || typeof l !== 'object') return null;
  const url = String(l.url || '').trim();
  if (!/^https:\/\//i.test(url)) return null;
  const label = cleanStr(l.label, 40);
  if (!label) return null;
  return { id: cleanStr(l.id || label, 24).toLowerCase().replace(/[^a-z0-9]+/g, '-'), label, url, how: cleanStr(l.how, 220), note: cleanStr(l.note, 220) };
}

// The one object a site hands the core: who the business is (for the prompt) and
// where reviews go (for the page). Throws on a config nobody could use.
export function normalizeBusiness(b) {
  if (!b || typeof b !== 'object') throw new Error('review: business config missing');
  const name = cleanStr(b.name, 80);
  if (!name) throw new Error('review: business.name is required');
  return {
    name,
    about: cleanStr(b.about, 600),
    links: (Array.isArray(b.links) ? b.links : []).map(cleanLink).filter(Boolean).slice(0, 4),
    chips: (Array.isArray(b.chips) ? b.chips : []).map((c) => cleanStr(c, 40)).filter(Boolean).slice(0, 8),
  };
}

// ---------------------------------------------------------------- pin

export function checkPin(given, expected) {
  const a = crypto.createHash('sha256').update(String(given == null ? '' : given)).digest();
  const b = crypto.createHash('sha256').update(String(expected == null ? '' : expected)).digest();
  return String(expected || '').length > 0 && crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------- request

const bad = (message, status = 400) => Object.assign(new Error(message), { status });
const cleanText = (v, max) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);

export function validateDraftRequest(body) {
  const mode = MODES.includes(body.mode) ? body.mode : 'draft';
  const notes = cleanText(body.notes, LIMITS.notesMax);
  const draft = cleanText(body.draft, LIMITS.draftMax);
  if (NEEDS_NOTES.has(mode)) {
    const words = notes.split(/\s+/).filter(Boolean).length;
    if (notes.length < LIMITS.notesMin || words < LIMITS.notesMinWords) throw bad('Tell us a little more first — a few words about your day is plenty.');
  }
  if (NEEDS_DRAFT.has(mode) && !draft) throw bad('There is no draft to work on yet.');
  return {
    mode,
    notes,
    draft,
    tone: TONES.includes(body.tone) ? body.tone : 'casual',
    length: LENGTHS.includes(body.length) ? body.length : 'short',
  };
}

// ---------------------------------------------------------------- prompt

const pick = (list, rng) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

export function buildPrompt({ business, request, rng = Math.random }) {
  const system = [
    `You help a real guest of ${business.name} put their own experience into words for a public review on a site like Google or Viator.${business.about ? ` About the business: ${business.about}` : ''}`,
    'The guest gives you a few notes about their visit. You write a draft in the first person, in their voice. They will read it, change whatever they like, and post it under their own name.',
    [
      'What matters:',
      '- Build the draft from what the guest actually told you. Their details are the point: they make the review true, and they make it unlike every other review. Do not add specifics they did not mention: no names of people or places, no food, drinks, weather, prices or events of your own. The business description above is only there so you can follow what they are referring to. It is not material for the review.',
      '- Keep their honest opinion. If they mention something they did not love, keep it in, in a fair tone. Never turn a mild note into a rave.',
      '- Sound like a person typing on their phone, not like marketing copy. Plain words. No hashtags, no headline, no star rating, no sign-off, no quotation marks around the draft, and no emoji unless the guest used them.',
      '- Follow the style card in the request. It changes from request to request so that no two drafts read alike.',
      '- Write in the language the guest wrote their notes in.',
    ].join('\n'),
    `Reply with the review text only. If the notes give you nothing you can use about a visit (they are empty, off-topic, or ask you for something else), reply with exactly ${SENTINEL} and nothing else.`,
  ].join('\n\n');

  const { mode, notes, draft, tone, length } = request;
  const notesBlock = notes ? `<guest_notes>\n${notes}\n</guest_notes>` : '';
  const draftBlock = draft ? `<current_draft>\n${draft}\n</current_draft>` : '';
  const card = `Style card: ${TONE_LINES[tone]}; ${LENGTH_LINES[length]}; ${pick(OPENINGS, rng)}; ${pick(SHAPES[length], rng)}.`;

  let user;
  if (mode === 'draft') {
    user = `${notesBlock}\n\n${card}`;
  } else if (mode === 'retake') {
    user = `${notesBlock}\n\n${draftBlock}\n\nWrite a fresh draft from the same notes. Open differently and build it differently from the current draft, so it reads like another person wrote it.\n\n${card}`;
  } else if (mode === 'shorter') {
    user = `${draftBlock}\n\nThe guest wants this shorter. Cut it to roughly half, keep the details that are most their own, and add nothing new.`;
  } else if (mode === 'casual') {
    user = `${draftBlock}\n\nThe guest wants this to sound more relaxed and conversational. Keep every fact and opinion as it is, keep about the same length, and add nothing new.`;
  } else {
    user = `${draftBlock}\n\nThe guest wrote or edited this themselves. Fix spelling, grammar and punctuation only. Keep their words, their opinions and their length. Add nothing.`;
  }
  return { system, user: user.trim() };
}

// ---------------------------------------------------------------- stream

const enc = new TextEncoder();
const line = (obj) => enc.encode(`${JSON.stringify(obj)}\n`);

// The first few characters are held back until we know the reply is not the
// NEED_MORE sentinel, so the guest never sees it flash into the draft box.
function sentinelGate(emit) {
  let held = '';
  let open = false;
  return {
    push(delta) {
      if (open) return emit(delta);
      held += delta;
      const probe = held.trimStart();
      // Still a possible "NEED_MORE" while what we have is a prefix of it.
      if (!SENTINEL.startsWith(probe.slice(0, SENTINEL.length))) {
        open = true;
        emit(probe);
      }
    },
    // → true when the whole reply was the sentinel
    end() {
      if (open) return false;
      const probe = held.trim();
      if (!probe || probe.startsWith(SENTINEL)) return true;
      emit(probe);
      return false;
    },
  };
}

function friendly(err) {
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return 'The writing helper is not set up yet. You can still write your review by hand.';
  if (err instanceof Anthropic.RateLimitError) return 'The writing helper is busy right now. Give it a minute and try again.';
  if (err instanceof Anthropic.APIConnectionError) return 'Could not reach the writing helper. Check your signal and try again.';
  return 'The writing helper hit a snag. Try again, or write it by hand.';
}

export function streamDraft({ client, business, request, rng }) {
  const { system, user } = buildPrompt({ business, request, rng });
  let upstream = null;
  return new ReadableStream({
    async start(controller) {
      let sent = false;
      const gate = sentinelGate((text) => {
        if (!text) return;
        sent = true;
        controller.enqueue(line({ t: 'text', v: text }));
      });
      try {
        upstream = client.beta.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          // A two-sentence draft needs no deliberation; low effort keeps the first word quick.
          output_config: { effort: 'low' },
          // If a safety classifier declines, Anthropic re-runs the request on its recommended model.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          system,
          messages: [{ role: 'user', content: user }],
        });
        upstream.on('text', (delta) => gate.push(delta));
        const final = await upstream.finalMessage();
        if (final.stop_reason === 'refusal') {
          controller.enqueue(line(sent ? { t: 'error', v: 'That one did not come out right. Try again with a few different words.' } : { t: 'need_more' }));
        } else if (gate.end()) {
          controller.enqueue(line({ t: 'need_more' }));
        }
        controller.enqueue(line({ t: 'done' }));
      } catch (err) {
        if (!(err instanceof Anthropic.APIUserAbortError)) {
          console.error('review: draft failed —', err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err && err.message);
          controller.enqueue(line({ t: 'error', v: friendly(err) }));
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      if (upstream) upstream.abort();      // the guest closed the page: stop paying for tokens nobody reads
    },
  });
}

// ---------------------------------------------------------------- http

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'x-robots-tag': 'noindex, nofollow' },
  });
}

// Browsers always send Origin on a cross-site POST; the page only ever calls its own host.
function sameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch (_) {
    return false;
  }
}

async function readBody(req) {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw bad('Too much text.', 413);
  try {
    const body = text ? JSON.parse(text) : {};
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('not an object');
    return body;
  } catch (_) {
    throw bad('Invalid request.');
  }
}

let sharedClient = null;
function defaultClient() {
  if (!sharedClient) sharedClient = new Anthropic({ timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });
  return sharedClient;
}

// business: normalizeBusiness() output · pin: the expected PIN · client: injected in tests
export async function handleReview(req, { business, pin, client } = {}) {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });
  if (!sameOrigin(req)) return json(403, { ok: false, error: 'Cross-origin request blocked' });
  try {
    const body = await readBody(req);
    if (!checkPin(cleanStr(body.pin, LIMITS.pinMax), pin)) return json(401, { ok: false, error: 'That is not the code.' });
    if (body.action === 'unlock') return json(200, { ok: true, business: { name: business.name, links: business.links, chips: business.chips } });
    if (body.action !== 'draft') return json(400, { ok: false, error: 'Unknown action.' });
    const request = validateDraftRequest(body);
    if (!client && !process.env.ANTHROPIC_API_KEY) {
      console.error('review: ANTHROPIC_API_KEY is not set on this site');
      return json(503, { ok: false, error: 'The writing helper is not set up yet. You can still write your review by hand.' });
    }
    return new Response(streamDraft({ client: client || defaultClient(), business, request }), {
      status: 200,
      headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'x-robots-tag': 'noindex, nofollow' },
    });
  } catch (err) {
    const status = err && err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) console.error('review: request failed —', err && (err.stack || err.message));
    return json(status, { ok: false, error: status === 500 ? 'Something went wrong.' : err.message });
  }
}
