// Builds a complete, safe content document from arbitrary input, driven by
// the site pack's SECTIONS. Unknown keys are dropped, text is clipped to each
// field's max, lists are capped. Missing keys fall back to `base`.
//
// Field types: text | textarea | toggle | select | list (of fields)
//   select: { options: [{ value, label }] | ['a', 'b'] } → value clamped to the
//   options (falls back to the base, then the first option). Sections may
//   carry `hidden: true` (kept in the document, not shown in the Content tab;
//   the engine uses this for the Setup checklist).

const TEXT_TYPES = new Set(['text', 'textarea']);

export function selectOptions(field) {
  return (field.options || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : { value: String(o.value), label: o.label || String(o.value) }));
}

function clipText(value, max) {
  const v = value == null ? '' : String(value);
  const trimmed = v.replace(/\r\n?/g, '\n').trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function sanitizeField(field, value, fallback) {
  if (TEXT_TYPES.has(field.type)) {
    return value === undefined ? clipText(fallback, field.max) : clipText(value, field.max);
  }
  if (field.type === 'toggle') {
    return value === undefined ? Boolean(fallback) : Boolean(value);
  }
  if (field.type === 'select') {
    const values = selectOptions(field).map((o) => o.value);
    const v = value === undefined ? fallback : value;
    return values.includes(String(v)) ? String(v) : values.includes(String(fallback)) ? String(fallback) : values[0] || '';
  }
  if (field.type === 'list') {
    const source = Array.isArray(value) ? value : Array.isArray(fallback) ? fallback : [];
    return source
      .slice(0, field.max)
      .map((item) => {
        const row = {};
        for (const sub of field.item) row[sub.key] = sanitizeField(sub, item && item[sub.key], '');
        return row;
      })
      .filter((row) => Object.values(row).some((v) => v !== '' && v !== false));
  }
  return fallback;
}

export function sanitizeContent(sections, input, base) {
  const src = input && typeof input === 'object' ? input : {};
  const out = {};
  for (const section of sections) {
    const inSec = src[section.key] && typeof src[section.key] === 'object' ? src[section.key] : {};
    const baseSec = (base && base[section.key]) || {};
    out[section.key] = {};
    for (const field of section.fields) {
      out[section.key][field.key] = sanitizeField(field, inSec[field.key], baseSec[field.key]);
    }
  }
  return out;
}

// Validates a SECTIONS definition once at startup so a typo in a site pack
// fails loudly instead of silently dropping owner edits.
export function assertSections(sections) {
  if (!Array.isArray(sections) || !sections.length) throw new Error('schema: SECTIONS must be a non-empty array');
  const seen = new Set();
  for (const s of sections) {
    if (!s.key || !/^[a-z][a-z0-9_]*$/.test(s.key)) throw new Error(`schema: bad section key ${JSON.stringify(s.key)}`);
    if (seen.has(s.key)) throw new Error(`schema: duplicate section ${s.key}`);
    seen.add(s.key);
    if (!Array.isArray(s.fields)) throw new Error(`schema: section ${s.key} needs fields[]`);
    for (const f of s.fields) checkField(f, s.key);
  }
  return sections;
}

function checkField(f, where) {
  if (!f.key || !/^[a-z][a-z0-9_]*$/.test(f.key)) throw new Error(`schema: bad field key in ${where}`);
  if (f.private !== undefined && typeof f.private !== 'boolean') throw new Error(`schema: ${where}.${f.key} private must be true or false`);
  if (TEXT_TYPES.has(f.type)) {
    if (!(Number(f.max) > 0)) throw new Error(`schema: ${where}.${f.key} needs max`);
  } else if (f.type === 'list') {
    if (!(Number(f.max) > 0) || !Array.isArray(f.item)) throw new Error(`schema: ${where}.${f.key} list needs max + item[]`);
    for (const sub of f.item) {
      if (sub.type === 'list') throw new Error(`schema: ${where}.${f.key} lists cannot nest`);
      checkField(sub, `${where}.${f.key}`);
    }
  } else if (f.type === 'select') {
    if (!selectOptions(f).length) throw new Error(`schema: ${where}.${f.key} select needs options[]`);
  } else if (f.type !== 'toggle') {
    throw new Error(`schema: ${where}.${f.key} has unknown type ${f.type}`);
  }
}

// The document a visitor may read: fields (and list columns) marked
// `private: true` are removed. GET /api/content is public, so anything the
// owner is told "only you see" must carry the flag. Editors get the stored
// document untouched (they PATCH whole lists back, so a stripped copy would
// erase the private columns). Returns a new document; never mutates.
export function publicContent(sections, doc) {
  if (!doc || typeof doc !== 'object') return {};
  const out = { ...doc };
  for (const section of sections) {
    const sec = doc[section.key];
    if (!sec || typeof sec !== 'object') continue;
    const copy = { ...sec };
    for (const field of section.fields) {
      if (field.private) { delete copy[field.key]; continue; }
      if (field.type !== 'list' || !Array.isArray(sec[field.key])) continue;
      const hidden = field.item.filter((sub) => sub.private).map((sub) => sub.key);
      if (!hidden.length) continue;
      copy[field.key] = sec[field.key].map((row) => {
        if (!row || typeof row !== 'object') return row;
        const kept = { ...row };
        for (const key of hidden) delete kept[key];
        return kept;
      });
    }
    out[section.key] = copy;
  }
  return out;
}

// Applies { '<section>.<field>': value } onto a complete document, checking
// every path against the sections (a list is replaced whole and only by an
// array; the caller sanitizes the result). Returns a new document; the
// input is not mutated. Throws a 400 on an unknown path so
// PATCH /api/admin/content never writes outside the schema.
export function applyPaths(sections, base, set) {
  const bad = (msg) => Object.assign(new Error(msg), { status: 400 });
  if (!set || typeof set !== 'object' || Array.isArray(set)) throw bad('set must be an object of "<section>.<field>": value');
  const entries = Object.entries(set);
  if (!entries.length || entries.length > 50) throw bad('set needs 1 to 50 paths');
  const out = {};
  for (const s of sections) out[s.key] = { ...((base && base[s.key]) || {}) };
  for (const [path, value] of entries) {
    const parts = String(path).split('.');
    const section = parts.length === 2 && sections.find((s) => s.key === parts[0]);
    const field = section && section.fields.find((f) => f.key === parts[1]);
    if (!field) throw bad(`Unknown field ${path}`);
    if (field.type === 'list' && !Array.isArray(value)) throw bad(`${path} takes a list`);
    out[parts[0]][parts[1]] = value;
  }
  return out;
}
