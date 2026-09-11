// Builds a complete, safe content document from arbitrary input, driven by
// the site pack's SECTIONS. Unknown keys are dropped, text is clipped to each
// field's max, lists are capped. Missing keys fall back to `base`.
//
// Field types: text | textarea | toggle | list (of fields)

const TEXT_TYPES = new Set(['text', 'textarea']);

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
  if (TEXT_TYPES.has(f.type)) {
    if (!(Number(f.max) > 0)) throw new Error(`schema: ${where}.${f.key} needs max`);
  } else if (f.type === 'list') {
    if (!(Number(f.max) > 0) || !Array.isArray(f.item)) throw new Error(`schema: ${where}.${f.key} list needs max + item[]`);
    for (const sub of f.item) {
      if (sub.type === 'list') throw new Error(`schema: ${where}.${f.key} lists cannot nest`);
      checkField(sub, `${where}.${f.key}`);
    }
  } else if (f.type !== 'toggle') {
    throw new Error(`schema: ${where}.${f.key} has unknown type ${f.type}`);
  }
}
