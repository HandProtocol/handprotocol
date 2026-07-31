const feedbackEndpoint = (import.meta.env.VITE_FEEDBACK_ENDPOINT as string | undefined)
  ?? 'https://handprotocol.org/.netlify/functions/feedback'
const feedbackQueueKey = 'wxl:feedback-queue'
const rememberedNameKey = 'wxl:feedback-name'

export type FeedbackInput = {
  text: string
  name?: string
  tags?: string[]
}

type FeedbackEntry = {
  text: string
  path: string
  title: string
  name: string
  tags: string[]
  source: string
  scroll: number
  ua: string
  vw: number
  vh: number
  ts: number
  website: string
}

function readFeedbackQueue(): FeedbackEntry[] {
  try {
    const stored = JSON.parse(localStorage.getItem(feedbackQueueKey) ?? '[]')
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

function saveFeedbackQueue(entries: FeedbackEntry[]) {
  try {
    localStorage.setItem(feedbackQueueKey, JSON.stringify(entries.slice(0, 50)))
  } catch {
    // Feedback still attempts a direct send when browser storage is unavailable.
  }
}

function buildFeedbackEntry(input: FeedbackInput): FeedbackEntry {
  const documentHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 1)
  return {
    text: input.text.trim(),
    path: `${window.location.pathname}${window.location.search}`,
    title: document.title || 'WXL:FOOD',
    name: input.name?.trim() ?? '',
    tags: input.tags ?? [],
    source: 'WXL:FOOD',
    scroll: Math.min(100, Math.round(((window.scrollY + window.innerHeight) / documentHeight) * 100)),
    ua: navigator.userAgent.slice(0, 200),
    vw: window.innerWidth,
    vh: window.innerHeight,
    ts: Date.now(),
    website: '',
  }
}

async function postFeedback(entry: FeedbackEntry) {
  try {
    const response = await fetch(feedbackEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      keepalive: true,
    })
    return response.ok
  } catch {
    return false
  }
}

export function notifyWxlAccountSignup(email: string) {
  return postFeedback({
    text: `Email: ${email.trim().toLowerCase()}`,
    path: '/app/?mode=login&signup=1',
    title: 'New WXL account signup',
    name: '',
    tags: ['wxl', 'account-signup', 'signup'],
    source: 'WXL:FOOD Account Signup',
    scroll: 0,
    ua: navigator.userAgent.slice(0, 200),
    vw: window.innerWidth,
    vh: window.innerHeight,
    ts: Date.now(),
    website: '',
  })
}

export function getRememberedFeedbackName() {
  try {
    return localStorage.getItem(rememberedNameKey) ?? ''
  } catch {
    return ''
  }
}

export async function sendWxlFeedback(input: FeedbackInput): Promise<'sent' | 'queued'> {
  const entry = buildFeedbackEntry(input)
  if (entry.name) {
    try {
      localStorage.setItem(rememberedNameKey, entry.name)
    } catch {
      // The feedback can still be sent when browser storage is unavailable.
    }
  }
  if (await postFeedback(entry)) return 'sent'

  const queue = readFeedbackQueue()
  if (!queue.some((item) => item.ts === entry.ts)) queue.push(entry)
  saveFeedbackQueue(queue)
  return 'queued'
}

export async function flushFeedbackQueue() {
  if (navigator.onLine === false) return
  const queue = readFeedbackQueue()
  if (!queue.length) return

  const remaining: FeedbackEntry[] = []
  for (const entry of queue) {
    if (!(await postFeedback(entry))) remaining.push(entry)
  }
  saveFeedbackQueue(remaining)
}
