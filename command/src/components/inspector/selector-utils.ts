/*
  DOM element introspection and selector generation, ported from
  noredFarms/admin/inspector-app.js. Pure functions, no React, no DOM
  ownership outside the iframe document passed in.
*/

export const STYLE_PROPS = [
  "display",
  "position",
  "width",
  "height",
  "margin",
  "padding",
  "border",
  "border-radius",
  "font-size",
  "font-weight",
  "font-family",
  "line-height",
  "color",
  "background-color",
  "background",
  "opacity",
  "flex-direction",
  "align-items",
  "justify-content",
  "gap",
  "text-align",
  "letter-spacing",
  "transition",
  "box-shadow",
] as const;

export type CapturedElement = {
  el: Element;
  tag: string;
  id: string | null;
  classes: string[];
  text: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  styles: Record<string, string>;
  parents: string[];
  selectors: string[];
  viewportWidth: number | null;
};

export function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const raw = typeof el.className === "string" ? el.className : "";
  const cls = raw
    ? "." +
      raw
        .split(/\s+/)
        .filter((c) => c && !c.startsWith("insp-"))
        .slice(0, 3)
        .join(".")
    : "";
  return `${tag}${id}${cls}`;
}

function isUnique(doc: Document, selector: string): boolean {
  try {
    return doc.querySelectorAll(selector).length === 1;
  } catch {
    return false;
  }
}

function fullPath(doc: Document, el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node !== doc.body) {
    const tag = node.tagName.toLowerCase();
    if (node.id) {
      parts.unshift(`#${node.id}`);
      break;
    }
    const parent: Element | null = node.parentElement;
    if (parent) {
      const idx = Array.from(parent.children).indexOf(node) + 1;
      parts.unshift(`${tag}:nth-child(${idx})`);
    } else {
      parts.unshift(tag);
    }
    node = parent;
  }
  return parts.join(" > ");
}

export function generateSelectors(doc: Document, el: Element): string[] {
  const selectors: string[] = [];

  if (el.id) {
    selectors.push(`#${el.id}`);
  }

  const tag = el.tagName.toLowerCase();
  const raw = typeof el.className === "string" ? el.className : "";
  const classes = raw
    ? raw
        .split(/\s+/)
        .filter((c) => c && !c.startsWith("insp-"))
    : [];

  if (classes.length > 0) {
    for (const cls of classes) {
      const sel = `${tag}.${cls}`;
      if (isUnique(doc, sel)) {
        selectors.push(sel);
        break;
      }
    }
    if (selectors.length < 2 && classes.length >= 2) {
      const sel = `${tag}.${classes.slice(0, 2).join(".")}`;
      if (isUnique(doc, sel)) selectors.push(sel);
    }
  }

  const parent = el.parentElement;
  if (parent && selectors.length < 3) {
    const desc = describeElement(parent);
    const siblings = Array.from(parent.children);
    const idx = siblings.indexOf(el) + 1;
    selectors.push(`${desc} > ${tag}:nth-child(${idx})`);
  }

  if (selectors.length < 3) {
    selectors.push(fullPath(doc, el));
  }

  // Dedupe while preserving order.
  const seen = new Set<string>();
  return selectors.filter((s) => {
    if (seen.has(s)) return false;
    seen.add(s);
    return true;
  }).slice(0, 4);
}

export function captureElement(
  doc: Document,
  el: Element,
  viewportWidth: number | null,
): CapturedElement {
  const rect = el.getBoundingClientRect();
  const win = doc.defaultView;
  const computed = win ? win.getComputedStyle(el) : null;

  const parents: string[] = [];
  let p: Element | null = el.parentElement;
  for (let i = 0; i < 3 && p && p !== doc.body; i++) {
    parents.push(describeElement(p));
    p = p.parentElement;
  }

  const styles: Record<string, string> = {};
  if (computed) {
    for (const prop of STYLE_PROPS) {
      styles[prop] = computed.getPropertyValue(prop);
    }
  }

  const raw = typeof el.className === "string" ? el.className : "";
  const classes = raw
    ? raw
        .split(/\s+/)
        .filter((c) => c && !c.startsWith("insp-"))
    : [];

  return {
    el,
    tag: el.tagName.toLowerCase(),
    id: el.id || null,
    classes,
    text: (el.textContent || "").trim().substring(0, 200),
    boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    styles,
    parents,
    selectors: generateSelectors(doc, el),
    viewportWidth,
  };
}

export function findElement(
  doc: Document,
  primary: string,
  fallback: string[] | null | undefined,
): Element | null {
  const all = [primary, ...(fallback ?? [])];
  for (const sel of all) {
    if (!sel) continue;
    try {
      const el = doc.querySelector(sel);
      if (el) return el;
    } catch {
      // Invalid selector — try the next one.
    }
  }
  return null;
}
