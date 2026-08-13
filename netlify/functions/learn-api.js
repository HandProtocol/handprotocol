// HAND Learn course API — accounts, saved progress, review pins, and
// stuck-flag alerts for the course surface at /learn/.
//
// One POST endpoint, JSON body { action, ... }. Storage is Supabase
// (command.course_* tables, see migration 042) via the service role.
// Sessions are stateless HMAC tokens so no session table is needed.
//
// Env vars (Netlify dashboard → Site settings → Environment):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY        — required, storage
//   LEARN_SESSION_SECRET                           — optional; falls back to a
//                                                    derivation of the service key
//   LEARN_COACH_PASSWORD                           — coach dashboard password;
//                                                    falls back to DEMOS_PITCH_PASSWORD
//   TELEGRAM_BOT_TOKEN, FORUM_GROUP_ID,
//   ALERTS_TOPIC_ID, ACTIVITY_TOPIC_ID             — optional pings (best effort)
//   RESEND_API_KEY, EMAIL_FROM                     — optional welcome email

const crypto = require('crypto');
const { notify, escapeHtml } = require('./_telegram.js');
const { sendEmail } = require('./_email.js');

const COURSE_KEY = 'claude-code-101';

// Lesson registry — keys must match the /learn/<key>/ page directories.
const LESSONS = {
  '00-welcome': 'Welcome & how this works',
  '01-what-is-claude-code': 'What is Claude Code?',
  '02-set-up': 'Set up your workspace',
  '03-first-conversation': 'Your first conversation',
  '04-core-skills': 'The skills that matter',
  '05-plan-your-app': 'Plan your app',
  '06-build-and-iterate': 'Build and iterate',
  '07-put-it-online': 'Put it online',
  '08-level-up': 'Level up & graduate',
};
const FINAL_LESSON = '08-level-up';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ANCHOR_RE = /^[a-z0-9][a-z0-9-]{0,120}$/i;

// ---------------------------------------------------------------- helpers --

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

function clip(value, max) {
  const v = (value == null ? '' : String(value)).trim();
  return v.length > max ? v.slice(0, max) : v;
}

function env(name) {
  return process.env[name] || '';
}

function sessionSecret() {
  return env('LEARN_SESSION_SECRET') || `${env('SUPABASE_SERVICE_ROLE_KEY')}::hand-learn`;
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function signToken(learnerId) {
  const exp = Math.floor(Date.now() / 1000) + 120 * 24 * 3600; // 120 days
  const payload = `${learnerId}.${exp}`;
  const sig = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  return `${b64url(payload)}.${sig}`;
}

function verifyToken(token) {
  if (typeof token !== 'string' || token.length > 400) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  let payload;
  try {
    payload = Buffer.from(token.slice(0, dot), 'base64url').toString('utf8');
  } catch (_) {
    return null;
  }
  const expected = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  const given = token.slice(dot + 1);
  if (
    expected.length !== given.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given))
  ) {
    return null;
  }
  const [learnerId, expStr] = payload.split('.');
  if (!learnerId || !/^\d+$/.test(expStr || '')) return null;
  if (Number(expStr) * 1000 < Date.now()) return null;
  return learnerId;
}

function hashPasscode(passcode) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(passcode, salt, 64);
  return `s2$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPasscode(passcode, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 's2') return false;
  try {
    const salt = Buffer.from(parts[1], 'hex');
    const expected = Buffer.from(parts[2], 'hex');
    const hash = crypto.scryptSync(passcode, salt, expected.length);
    return crypto.timingSafeEqual(hash, expected);
  } catch (_) {
    return false;
  }
}

function constantTimeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) {
    crypto.timingSafeEqual(ab, ab); // burn comparable time
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

// ----------------------------------------------------------- supabase REST --

function restBase() {
  return `${env('SUPABASE_URL').replace(/\/$/, '')}/rest/v1`;
}

async function sb(path, { method = 'GET', body, prefer } = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Accept-Profile': 'command',
    'Content-Profile': 'command',
  };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${restBase()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const err = new Error(`supabase ${method} ${path} → ${res.status}: ${detail.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

function publicLearner(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    mode: row.mode,
    created_at: row.created_at,
    graduated_at: row.graduated_at,
  };
}

async function loadState(learnerId) {
  const [progress, pins] = await Promise.all([
    sb(
      `/course_progress?learner_id=eq.${learnerId}&course_key=eq.${COURSE_KEY}` +
        `&select=lesson_key,status,checkpoint,updated_at`
    ),
    sb(
      `/course_pins?learner_id=eq.${learnerId}&course_key=eq.${COURSE_KEY}` +
        `&select=lesson_key,anchor,title,note,created_at,resolved_at&order=created_at.asc`
    ),
  ]);
  return { progress: progress || [], pins: pins || [] };
}

async function getLearner(learnerId) {
  const rows = await sb(`/course_learners?id=eq.${learnerId}&select=*`);
  return rows && rows[0] ? rows[0] : null;
}

function logEvent(learnerId, lesson, kind, detail) {
  // Fire-and-forget: the activity stream must never break the main action.
  return sb('/course_events', {
    method: 'POST',
    prefer: 'return=minimal',
    body: {
      learner_id: learnerId,
      course_key: COURSE_KEY,
      lesson_key: lesson || null,
      kind,
      detail: detail || null,
    },
  }).catch((err) => console.warn('learn-api event failed:', err.message));
}

function touchLastSeen(learnerId) {
  return sb(`/course_learners?id=eq.${learnerId}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: { last_seen_at: new Date().toISOString() },
  }).catch((err) => console.warn('learn-api last_seen failed:', err.message));
}

// ---------------------------------------------------------------- actions --

async function actionSignup(body) {
  // Honeypot: real form leaves "website" empty.
  if (clip(body.website, 10)) return json(200, { ok: true });

  const name = clip(body.name, 80);
  const email = clip(body.email, 160).toLowerCase();
  const passcode = String(body.passcode || '');
  const mode = body.mode === 'guided' ? 'guided' : 'solo';

  if (!name) return json(400, { error: 'Please tell us your name.' });
  if (!EMAIL_RE.test(email)) return json(400, { error: 'That email doesn’t look right.' });
  if (passcode.length < 6) {
    return json(400, { error: 'Pick a passcode of at least 6 characters.' });
  }

  const existing = await sb(
    `/course_learners?email=eq.${encodeURIComponent(email)}&select=id`
  );
  if (existing && existing.length) {
    return json(409, { error: 'That email already has an account — sign in instead.' });
  }

  const rows = await sb('/course_learners', {
    method: 'POST',
    prefer: 'return=representation',
    body: { name, email, passcode_hash: hashPasscode(passcode), mode },
  });
  const learner = rows && rows[0];
  if (!learner) return json(500, { error: 'Could not create your account. Try again.' });

  await logEvent(learner.id, null, 'signup', { mode });
  await notify('alerts', {
    title: '🎒 New course learner',
    lines: [
      `${escapeHtml(name)} · ${escapeHtml(email)}`,
      `Mode: ${mode === 'guided' ? 'guided (with a HAND human)' : 'solo self-serve'}`,
      'Course: Build your first app with Claude Code',
    ],
  });
  await sendEmail({
    to: email,
    subject: 'Welcome to HAND Learn — your Claude Code course',
    text:
      `Hi ${name},\n\n` +
      `You're signed up for "Build your first app with Claude Code."\n\n` +
      `Your course home: https://handprotocol.org/learn/\n` +
      `Sign in with this email and the passcode you chose. Your progress and\n` +
      `pinned review topics are saved automatically.\n\n` +
      `If you ever get stuck, press the "I'm stuck" button on any lesson —\n` +
      `a real person at HAND sees it and will reach out.\n\n` +
      `— HAND Protocol\n`,
  });

  return json(200, {
    token: signToken(learner.id),
    learner: publicLearner(learner),
    progress: [],
    pins: [],
  });
}

async function actionLogin(body) {
  const email = clip(body.email, 160).toLowerCase();
  const passcode = String(body.passcode || '');
  const fail = () => json(401, { error: 'Email or passcode didn’t match.' });

  if (!EMAIL_RE.test(email) || !passcode) return fail();
  const rows = await sb(`/course_learners?email=eq.${encodeURIComponent(email)}&select=*`);
  const learner = rows && rows[0];
  if (!learner || !verifyPasscode(passcode, learner.passcode_hash)) return fail();

  await touchLastSeen(learner.id);
  await logEvent(learner.id, null, 'login', null);
  const state = await loadState(learner.id);
  return json(200, { token: signToken(learner.id), learner: publicLearner(learner), ...state });
}

async function actionMe(learner) {
  await touchLastSeen(learner.id);
  const state = await loadState(learner.id);
  return json(200, { learner: publicLearner(learner), ...state });
}

async function actionView(learner, body) {
  const lesson = String(body.lesson || '');
  if (!LESSONS[lesson]) return json(400, { error: 'Unknown lesson.' });

  await touchLastSeen(learner.id);
  // Auto-start the lesson on first view so the coach view shows real position.
  await sb('/course_progress?on_conflict=learner_id,course_key,lesson_key', {
    method: 'POST',
    prefer: 'resolution=ignore-duplicates,return=minimal',
    body: { learner_id: learner.id, course_key: COURSE_KEY, lesson_key: lesson },
  });
  await logEvent(learner.id, lesson, 'lesson_view', null);
  return json(200, { ok: true });
}

async function actionProgress(learner, body) {
  const lesson = String(body.lesson || '');
  if (!LESSONS[lesson]) return json(400, { error: 'Unknown lesson.' });
  const status = body.status === 'complete' ? 'complete' : 'in_progress';
  const checkpoint =
    body.checkpoint && typeof body.checkpoint === 'object' ? body.checkpoint : undefined;

  const prevRows = await sb(
    `/course_progress?learner_id=eq.${learner.id}&course_key=eq.${COURSE_KEY}` +
      `&lesson_key=eq.${encodeURIComponent(lesson)}&select=status`
  );
  const prevStatus = prevRows && prevRows[0] ? prevRows[0].status : null;

  const row = {
    learner_id: learner.id,
    course_key: COURSE_KEY,
    lesson_key: lesson,
    status,
    updated_at: new Date().toISOString(),
  };
  if (checkpoint !== undefined) row.checkpoint = checkpoint;
  await sb('/course_progress?on_conflict=learner_id,course_key,lesson_key', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: row,
  });
  await touchLastSeen(learner.id);

  if (status === 'complete' && prevStatus !== 'complete') {
    await logEvent(learner.id, lesson, 'complete', null);
    await notify('activity', {
      title: `📗 Course progress · ${escapeHtml(learner.name)}`,
      lines: [`Completed: ${escapeHtml(LESSONS[lesson])}`],
    });
    if (lesson === FINAL_LESSON && !learner.graduated_at) {
      await sb(`/course_learners?id=eq.${learner.id}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: { graduated_at: new Date().toISOString() },
      });
      await logEvent(learner.id, lesson, 'graduated', null);
      await notify('alerts', {
        title: '🎓 Course graduate!',
        lines: [
          `${escapeHtml(learner.name)} · ${escapeHtml(learner.email)}`,
          'Finished: Build your first app with Claude Code',
        ],
      });
    }
  } else if (prevStatus === 'stuck' && status !== 'stuck') {
    await logEvent(learner.id, lesson, 'unstuck', null);
  }

  const state = await loadState(learner.id);
  return json(200, { ok: true, ...state });
}

async function actionStuck(learner, body) {
  const lesson = String(body.lesson || '');
  if (!LESSONS[lesson]) return json(400, { error: 'Unknown lesson.' });
  const note = clip(body.note, 2000);

  await sb('/course_progress?on_conflict=learner_id,course_key,lesson_key', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: {
      learner_id: learner.id,
      course_key: COURSE_KEY,
      lesson_key: lesson,
      status: 'stuck',
      checkpoint: { stuck_note: note || null, stuck_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    },
  });
  await touchLastSeen(learner.id);
  await logEvent(learner.id, lesson, 'stuck', note ? { note } : null);
  await notify('alerts', {
    title: '🆘 Course learner is stuck',
    lines: [
      `${escapeHtml(learner.name)} · ${escapeHtml(learner.email)}`,
      `Lesson: ${escapeHtml(LESSONS[lesson])}`,
      note ? `“${escapeHtml(note.slice(0, 400))}”` : '(no note left)',
      'They were told a human will reach out.',
    ],
  });

  const state = await loadState(learner.id);
  return json(200, { ok: true, ...state });
}

async function actionPin(learner, body) {
  const lesson = String(body.lesson || '');
  if (!LESSONS[lesson]) return json(400, { error: 'Unknown lesson.' });
  const anchor = clip(body.anchor, 120);
  if (!ANCHOR_RE.test(anchor)) return json(400, { error: 'Bad section anchor.' });

  await sb('/course_pins?on_conflict=learner_id,course_key,lesson_key,anchor', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: {
      learner_id: learner.id,
      course_key: COURSE_KEY,
      lesson_key: lesson,
      anchor,
      title: clip(body.title, 200) || null,
      note: clip(body.note, 1000) || null,
      resolved_at: null,
    },
  });
  await logEvent(learner.id, lesson, 'pin', { anchor });
  const state = await loadState(learner.id);
  return json(200, { ok: true, ...state });
}

async function actionUnpin(learner, body) {
  const lesson = String(body.lesson || '');
  const anchor = clip(body.anchor, 120);
  if (!LESSONS[lesson] || !ANCHOR_RE.test(anchor)) {
    return json(400, { error: 'Bad pin reference.' });
  }
  await sb(
    `/course_pins?learner_id=eq.${learner.id}&course_key=eq.${COURSE_KEY}` +
      `&lesson_key=eq.${encodeURIComponent(lesson)}&anchor=eq.${encodeURIComponent(anchor)}`,
    { method: 'PATCH', prefer: 'return=minimal', body: { resolved_at: new Date().toISOString() } }
  );
  await logEvent(learner.id, lesson, 'unpin', { anchor });
  const state = await loadState(learner.id);
  return json(200, { ok: true, ...state });
}

async function actionCoach(body) {
  const expected = env('LEARN_COACH_PASSWORD') || env('DEMOS_PITCH_PASSWORD');
  if (!expected) return json(503, { error: 'Coach dashboard is not configured yet.' });
  if (!constantTimeEqual(String(body.password || ''), expected)) {
    return json(401, { error: 'Wrong password.' });
  }

  const [learners, progress, pins, events] = await Promise.all([
    sb(
      '/course_learners?select=id,name,email,mode,created_at,last_seen_at,graduated_at' +
        '&order=created_at.desc&limit=500'
    ),
    sb(`/course_progress?course_key=eq.${COURSE_KEY}&select=learner_id,lesson_key,status,checkpoint,updated_at`),
    sb(
      `/course_pins?course_key=eq.${COURSE_KEY}` +
        '&select=learner_id,lesson_key,anchor,title,note,created_at,resolved_at&order=created_at.desc&limit=1000'
    ),
    sb(
      '/course_events?select=learner_id,lesson_key,kind,detail,created_at' +
        '&order=created_at.desc&limit=300'
    ),
  ]);
  return json(200, {
    lessons: LESSONS,
    learners: learners || [],
    progress: progress || [],
    pins: pins || [],
    events: events || [],
  });
}

// ---------------------------------------------------------------- handler --

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only.' });
  if (!env('SUPABASE_URL') || !env('SUPABASE_SERVICE_ROLE_KEY')) {
    return json(503, { error: 'Course backend is not configured yet.' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json(400, { error: 'Bad JSON.' });
  }
  const action = String(body.action || '');

  try {
    if (action === 'signup') return await actionSignup(body);
    if (action === 'login') return await actionLogin(body);
    if (action === 'coach') return await actionCoach(body);

    // Everything else needs a valid session token.
    const learnerId = verifyToken(body.token);
    if (!learnerId) return json(401, { error: 'Please sign in again.' });
    const learner = await getLearner(learnerId);
    if (!learner) return json(401, { error: 'Please sign in again.' });

    if (action === 'me') return await actionMe(learner);
    if (action === 'view') return await actionView(learner, body);
    if (action === 'progress') return await actionProgress(learner, body);
    if (action === 'stuck') return await actionStuck(learner, body);
    if (action === 'pin') return await actionPin(learner, body);
    if (action === 'unpin') return await actionUnpin(learner, body);

    return json(400, { error: 'Unknown action.' });
  } catch (err) {
    console.error('learn-api error:', err);
    return json(500, { error: 'Something went wrong on our side. Try again in a minute.' });
  }
};
