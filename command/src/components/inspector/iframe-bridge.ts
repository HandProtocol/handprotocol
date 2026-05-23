/*
  Bridge that runs inside the iframe document. Hover outline, click
  capture, touch long-press. Mounted by the host Inspector React tree
  via injectBridge() once the iframe finishes loading.

  Returns a teardown function so React effects can tear the listeners
  down on page change or unmount.
*/

const HOVER_CLASS = "insp-hover-outline";
const SELECTED_CLASS = "insp-selected";
const FLASH_CLASS = "insp-flash";
const STYLE_ID = "insp-bridge-styles";
const TOOLTIP_ID = "insp-bridge-tooltip";

type BridgeOpts = {
  onPick: (el: Element) => void;
  isActive: () => boolean;
};

const BRIDGE_CSS = `
.${HOVER_CLASS} {
  outline: 2px solid var(--amber-soft, #ffba49) !important;
  outline-offset: 1px;
}
.${SELECTED_CLASS} {
  outline: 2px solid var(--amber-soft, #ffba49) !important;
  outline-offset: 2px;
}
.${FLASH_CLASS} {
  animation: insp-flash-anim 0.7s ease;
}
@keyframes insp-flash-anim {
  0%, 100% { outline-color: transparent; }
  25%, 75% { outline: 3px solid #ffba49; outline-offset: 2px; }
}
#${TOOLTIP_ID} {
  position: fixed;
  z-index: 2147483647;
  background: rgba(7, 9, 15, 0.94);
  color: #ffba49;
  font-family: ui-monospace, "JetBrains Mono", monospace;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid rgba(217, 119, 6, 0.4);
  pointer-events: none;
  white-space: nowrap;
  max-width: 460px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: none;
}
`;

export function injectBridge(doc: Document, opts: BridgeOpts): () => void {
  // Inject style sheet once.
  if (!doc.getElementById(STYLE_ID)) {
    const style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = BRIDGE_CSS;
    doc.head.appendChild(style);
  }

  let tooltip = doc.getElementById(TOOLTIP_ID) as HTMLDivElement | null;
  if (!tooltip) {
    tooltip = doc.createElement("div");
    tooltip.id = TOOLTIP_ID;
    doc.body.appendChild(tooltip);
  }

  let hovered: Element | null = null;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressEl: Element | null = null;

  function isInspectable(el: EventTarget | null): el is Element {
    if (!el || !(el instanceof Element)) return false;
    if (el === tooltip) return false;
    if (el === doc.body || el === doc.documentElement) return false;
    return true;
  }

  function onMouseOver(e: Event) {
    if (!opts.isActive()) return;
    const target = e.target;
    if (!isInspectable(target)) return;
    if (hovered) hovered.classList.remove(HOVER_CLASS);
    target.classList.add(HOVER_CLASS);
    hovered = target;

    const tag = target.tagName.toLowerCase();
    const id = target.id ? `#${target.id}` : "";
    const raw = typeof target.className === "string" ? target.className : "";
    const classes = raw
      ? "." +
        raw
          .split(/\s+/)
          .filter((c: string) => c && !c.startsWith("insp-"))
          .join(".")
      : "";
    const rect = target.getBoundingClientRect();
    const dims = `${Math.round(rect.width)}×${Math.round(rect.height)}`;
    if (tooltip) {
      tooltip.textContent = `${tag}${id}${classes}  ·  ${dims}`;
      tooltip.style.display = "block";
    }
  }

  function onMouseOut() {
    if (!opts.isActive()) return;
    if (hovered) {
      hovered.classList.remove(HOVER_CLASS);
      hovered = null;
    }
    if (tooltip) tooltip.style.display = "none";
  }

  function onMouseMove(e: MouseEvent) {
    if (!opts.isActive() || !tooltip) return;
    tooltip.style.left = e.clientX + 12 + "px";
    tooltip.style.top = e.clientY + 12 + "px";
  }

  function onClick(e: MouseEvent) {
    if (!opts.isActive()) return;
    const target = e.target;
    if (!isInspectable(target)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (hovered) hovered.classList.remove(HOVER_CLASS);
    target.classList.add(SELECTED_CLASS);
    setTimeout(() => target.classList.remove(SELECTED_CLASS), 1100);
    opts.onPick(target);
  }

  function onTouchStart(e: TouchEvent) {
    if (!opts.isActive()) return;
    e.preventDefault();
    const touch = e.touches[0];
    longPressEl = doc.elementFromPoint(touch.clientX, touch.clientY);
    longPressTimer = setTimeout(() => {
      const el = longPressEl;
      if (!isInspectable(el)) return;
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
      el.classList.add(SELECTED_CLASS);
      setTimeout(() => el.classList.remove(SELECTED_CLASS), 1100);
      opts.onPick(el);
    }, 320);
  }

  function clearLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function onTouchEnd(e: TouchEvent) {
    clearLongPress();
    if (!opts.isActive()) return;
    e.preventDefault();
  }

  doc.addEventListener("mouseover", onMouseOver, true);
  doc.addEventListener("mouseout", onMouseOut, true);
  doc.addEventListener("mousemove", onMouseMove, true);
  doc.addEventListener("click", onClick, true);
  doc.addEventListener("touchstart", onTouchStart, {
    capture: true,
    passive: false,
  });
  doc.addEventListener("touchmove", clearLongPress, {
    capture: true,
    passive: true,
  });
  doc.addEventListener("touchend", onTouchEnd, true);
  doc.addEventListener("touchcancel", clearLongPress, true);

  return () => {
    doc.removeEventListener("mouseover", onMouseOver, true);
    doc.removeEventListener("mouseout", onMouseOut, true);
    doc.removeEventListener("mousemove", onMouseMove, true);
    doc.removeEventListener("click", onClick, true);
    doc.removeEventListener("touchstart", onTouchStart, true);
    doc.removeEventListener("touchmove", clearLongPress, true);
    doc.removeEventListener("touchend", onTouchEnd, true);
    doc.removeEventListener("touchcancel", clearLongPress, true);

    if (hovered) {
      hovered.classList.remove(HOVER_CLASS);
      hovered = null;
    }
    if (tooltip) tooltip.style.display = "none";
  };
}

export function flashElement(el: Element) {
  el.classList.add(FLASH_CLASS);
  setTimeout(() => el.classList.remove(FLASH_CLASS), 750);
}
