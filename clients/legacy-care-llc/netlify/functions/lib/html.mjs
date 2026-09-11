// Small HTML helpers shared by the renderer.

export function escapeHtml(input) {
  return String(input == null ? '' : input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const e = escapeHtml;

// Multi-line text → paragraphs (blank line = new paragraph, single newline = <br>).
export function paragraphs(text, className) {
  const cls = className ? ` class="${className}"` : '';
  return String(text || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p${cls}>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function telHref(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '';
}

export function smsHref(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return digits ? `sms:${digits}` : '';
}

export function instagramUrl(handle) {
  const h = String(handle || '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '');
  return h ? `https://instagram.com/${encodeURIComponent(h)}` : '';
}

export function jsonForScript(value) {
  // Safe to embed inside <script type="application/json">.
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
