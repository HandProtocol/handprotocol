// Tiny helpers shared by the check modules.
//
// A check is { id, category, title, gate?, site(ctx) | page(ctx, a) }.
// It returns a list of findings (empty = pass) or { skip: 'reason' }.
// A finding is { severity, message, url?, evidence?, fix?, engineFix?, who? }:
//   severity  fail = keeps the page out of search or misleads people
//             warn = costs ranking or clicks
//             info = polish, or something to know
//   who       hand (default: HAND can fix it now), owner (needs the owner's
//             facts, accounts or decisions), cutover (settled when the site
//             moves to its own domain)
//   gate      on the check: it belongs to the launch gate.
export const fail = (message, extra = {}) => ({ severity: 'fail', message, ...extra });
export const warn = (message, extra = {}) => ({ severity: 'warn', message, ...extra });
export const info = (message, extra = {}) => ({ severity: 'info', message, ...extra });

export const digits = (value) => String(value || '').replace(/\D/g, '');

// US-style phone numbers in running text.
export const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\b[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

export function phonesIn(text) {
  return [...new Set((String(text || '').match(PHONE_RE) || []).map((p) => digits(p).slice(-10)))];
}

// Text that should never reach a live page.
export const PLACEHOLDER_RE = /lorem ipsum|dolor sit amet|placeholder until you change it|\bstudio name\b|\byour (business|company) name\b|\b(todo|tbd|fixme)\b|\[(practitioner|owner|business|client|your|insert|add|phone|address|name)[^\]]{0,40}\]|example\.com|\b555[-.\s]01\d\d\b/i;
// Copy that admits the page is not finished. Not broken, but a visitor (and
// the owner) should know it is still there.
export const UNFINISHED_RE = /\bcoming soon\b|\bwill be added\b|\bunder construction\b|\bto be announced\b|\bcheck back (soon|later)\b|\bmore (info|details|information) (coming|soon)\b/i;

export const clip = (text, max = 110) => {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

// A quote around a match, cut at word boundaries so it never starts or ends
// mid-word.
export function excerpt(text, index, { before = 50, after = 70 } = {}) {
  const s = String(text ?? '');
  let start = Math.max(0, index - before);
  let end = Math.min(s.length, index + after);
  if (start > 0) {
    const sp = s.indexOf(' ', start);
    start = sp !== -1 && sp < index ? sp + 1 : start;
  }
  if (end < s.length) {
    const sp = s.lastIndexOf(' ', end);
    end = sp > index ? sp : end;
  }
  return `${start > 0 ? '…' : ''}${s.slice(start, end).replace(/\s+/g, ' ').trim()}${end < s.length ? '…' : ''}`;
}

// "a JPEG", "an SVG", "an AVIF"
export const article = (word) => (/^[aefhilmnorsx]/i.test(word) && /^[A-Z]+$/.test(word) ? 'an' : /^[aeiou]/i.test(word) ? 'an' : 'a');
