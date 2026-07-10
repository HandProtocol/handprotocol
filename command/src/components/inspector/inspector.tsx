"use client";

/*
  UX Inspector. Loads a handprotocol.org surface in a same-origin iframe
  (via the /proxy/web rewrite), lets the operator click any element to
  drop a pin with a comment and priority, and renders existing pins as
  numbered markers over the iframe.

  Ported from noredFarms/admin/inspector-app.js. v1 features kept:
   - Page selector (HAND surfaces from INSPECTOR_PAGES)
   - Viewport switcher (375 / 768 / 100% / custom px)
   - Hover outline + click capture inside the iframe
   - Touch long-press capture for mobile
   - Pin overlay (numbered markers, color by status)
   - Feedback form (comment + priority + screenshot capture)
   - Live CSS editor for a selected pin
   - Pin list sidebar with status filter and status changer
   - Deep-link via ?page=<path>&pin=<id>

  Skipped from the noredFarms port: revisions surface, token audit,
  Claude prompt generation, Web Share. These were Nored-specific.
*/

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Crosshair,
  RefreshCw,
  Smartphone,
  Tablet,
  Monitor,
  X,
  Trash2,
  CornerDownRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  INSPECTOR_PAGES,
  PIN_PRIORITIES,
  PIN_STATUSES,
  type FeedbackPin,
  type PinPriority,
  type PinStatus,
} from "@/lib/inspector/types";
import {
  createPin,
  deletePin,
  updatePinStatus,
  addPinReply,
} from "@/lib/inspector/actions";
import {
  captureElement,
  findElement,
  STYLE_PROPS,
  type CapturedElement,
} from "./selector-utils";
import { flashElement, injectBridge } from "./iframe-bridge";

type ViewportPreset = "375" | "768" | "100%";

const VIEWPORT_PRESETS: { value: ViewportPreset; icon: typeof Smartphone; title: string }[] = [
  { value: "375", icon: Smartphone, title: "Mobile (375px)" },
  { value: "768", icon: Tablet, title: "Tablet (768px)" },
  { value: "100%", icon: Monitor, title: "Desktop (100%)" },
];

// html2canvas is loaded lazily on first pin so the inspector boot path
// stays light. The dependency is declared in package.json; this dynamic
// import keeps it out of the initial chunk.
async function captureScreenshot(el: Element, doc: Document): Promise<string | null> {
  try {
    const mod = await import("html2canvas");
    const html2canvas = mod.default || mod;
    const canvas = await html2canvas(el as HTMLElement, {
      backgroundColor: "#07090f",
      scale: 2,
      logging: false,
      useCORS: true,
      windowWidth: doc.documentElement.scrollWidth,
      windowHeight: doc.documentElement.scrollHeight,
    });
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

function proxyHref(path: string): string {
  // The dev rewrite forwards /proxy/web/<path> to handprotocol.org/<path>.
  // Strip a leading slash on the path because we already include one in
  // the rewrite prefix.
  const clean = path.startsWith("/") ? path.slice(1) : path;
  if (!clean) return "/proxy/web";
  return `/proxy/web/${clean}`;
}

export function Inspector({ initialPins }: { initialPins: FeedbackPin[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPage = searchParams?.get("page") ?? "";
  const initialPinId = searchParams?.get("pin") ?? null;

  const [currentPage, setCurrentPage] = useState<string>(initialPage);
  const [pins, setPins] = useState<FeedbackPin[]>(initialPins);
  const [inspectMode, setInspectMode] = useState(false);
  const [captured, setCaptured] = useState<CapturedElement | null>(null);
  const [comment, setComment] = useState("");
  const [priority, setPriority] = useState<PinPriority>("normal");
  const [statusFilter, setStatusFilter] = useState<"all" | PinStatus>("all");
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);
  const [customWidth, setCustomWidth] = useState("");
  const [selectedPin, setSelectedPin] = useState<FeedbackPin | null>(null);
  const [pending, startTransition] = useTransition();

  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const inspectModeRef = useRef(inspectMode);
  const teardownRef = useRef<(() => void) | null>(null);

  // Inspect mode is read inside the bridge via a ref so we don't have to
  // re-mount the listeners on every toggle.
  useEffect(() => {
    inspectModeRef.current = inspectMode;
  }, [inspectMode]);

  // Pins filtered for the active page, kept in submission order so the
  // numbered markers stay stable across status changes.
  const pinsOnPage = useMemo(() => {
    return pins
      .filter((p) => p.page_url === currentPage)
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [pins, currentPage]);

  const filteredPins = useMemo(() => {
    if (statusFilter === "all") return pinsOnPage;
    return pinsOnPage.filter((p) => p.status === statusFilter);
  }, [pinsOnPage, statusFilter]);

  // Refresh pins from the server. Called after every mutation so the
  // markers reflect the canonical state. We re-fetch via router.refresh
  // because the page component reads the list server-side.
  const refreshFromServer = useCallback(() => {
    router.refresh();
  }, [router]);

  // Replace pin list when the server-rendered props change (router.refresh).
  useEffect(() => {
    setPins(initialPins);
  }, [initialPins]);

  // Initialize from URL on mount. If a pin param is present and the pin
  // exists, select it and scroll its element into view.
  useEffect(() => {
    if (!initialPinId) return;
    const pin = initialPins.find((p) => p.id === initialPinId);
    if (!pin) return;
    if (!currentPage) setCurrentPage(pin.page_url);
    setSelectedPin(pin);
    // The actual scroll happens in the iframe-load effect.
  }, [initialPinId, initialPins, currentPage]);

  // Persist current page (without pin id) to the URL.
  useEffect(() => {
    if (!currentPage) return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", currentPage);
    if (!selectedPin) params.delete("pin");
    router.replace(`/inspector?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Inject the bridge whenever the iframe finishes loading. The bridge
  // owns hover/click/touch inside the iframe document and calls back
  // with the picked element.
  const onIframeLoad = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let doc: Document | null = null;
    try {
      doc = frame.contentDocument || frame.contentWindow?.document || null;
    } catch (err) {
      toast.error("Iframe is cross-origin. Check the /proxy/web rewrite.");
      console.error(err);
      return;
    }
    if (!doc) return;

    teardownRef.current?.();
    teardownRef.current = injectBridge(doc, {
      isActive: () => inspectModeRef.current,
      onPick: (el) => {
        const cap = captureElement(doc!, el, viewportWidth);
        setCaptured(cap);
        setComment("");
        setPriority("normal");
      },
    });

    // Keep markers positioned when the iframe scrolls or resizes.
    const win = frame.contentWindow;
    if (win) {
      const handler = () => renderOverlay();
      win.addEventListener("scroll", handler, { passive: true });
      win.addEventListener("resize", handler);
    }

    // Render overlay once content settles.
    setTimeout(() => {
      renderOverlay();
      // If we deep-linked to a pin, scroll its element into view.
      if (selectedPin && selectedPin.page_url === currentPage) {
        scrollIntoPin(selectedPin);
      }
    }, 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportWidth, selectedPin, currentPage]);

  // Teardown bridge on unmount or page change.
  useEffect(() => {
    return () => {
      teardownRef.current?.();
      teardownRef.current = null;
    };
  }, [currentPage]);

  // Render the numbered markers over the iframe by resolving each pin's
  // selector inside the iframe document and placing a div at the element's
  // viewport-relative position.
  const renderOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    const frame = frameRef.current;
    if (!overlay || !frame) return;

    let doc: Document | null = null;
    try {
      doc = frame.contentDocument || frame.contentWindow?.document || null;
    } catch {
      return;
    }
    if (!doc) return;

    overlay.innerHTML = "";

    pinsOnPage.forEach((pin, i) => {
      const el = findElement(doc!, pin.selector_primary, pin.selector_fallback);
      let x = 0;
      let y = 0;
      if (el) {
        const r = el.getBoundingClientRect();
        x = r.left;
        y = r.top;
      } else if (pin.bounding_box) {
        x = pin.bounding_box.x;
        y = pin.bounding_box.y;
      } else {
        return;
      }
      const marker = doc!.createElement("div");
      marker.className = "insp-marker";
      marker.textContent = String(i + 1);
      const color =
        pin.status === "resolved"
          ? "#4ade80"
          : pin.status === "in-progress"
            ? "#6b8eff"
            : "#ffba49";
      Object.assign(marker.style, {
        position: "absolute",
        left: `${x - 12}px`,
        top: `${y - 12}px`,
        width: "24px",
        height: "24px",
        borderRadius: "9999px",
        background: color,
        color: "#07090f",
        fontFamily: "ui-monospace, monospace",
        fontSize: "11px",
        fontWeight: "700",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        boxShadow: "0 0 0 2px rgba(7,9,15,0.7), 0 4px 12px rgba(0,0,0,0.4)",
        pointerEvents: "auto",
        zIndex: "2147483646",
        opacity: pin.status === "resolved" ? "0.55" : "1",
      });
      marker.title = pin.comment.slice(0, 100);
      marker.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedPin(pin);
        scrollIntoPin(pin);
      });
      overlay.appendChild(marker);
    });
  }, [pinsOnPage]);

  // Re-render overlay when pins or viewport change.
  useEffect(() => {
    renderOverlay();
  }, [renderOverlay, viewportWidth, pins.length]);

  function scrollIntoPin(pin: FeedbackPin) {
    const frame = frameRef.current;
    if (!frame) return;
    let doc: Document | null = null;
    try {
      doc = frame.contentDocument || frame.contentWindow?.document || null;
    } catch {
      return;
    }
    if (!doc) return;
    const el = findElement(doc, pin.selector_primary, pin.selector_fallback);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    flashElement(el);
  }

  function chooseViewport(value: ViewportPreset | number) {
    if (value === "100%") {
      setViewportWidth(null);
      setCustomWidth("");
    } else {
      const n = typeof value === "number" ? value : parseInt(value, 10);
      setViewportWidth(n);
      setCustomWidth(String(n));
    }
    setTimeout(renderOverlay, 360);
  }

  function handleCustomWidth(v: string) {
    setCustomWidth(v);
    const n = parseInt(v, 10);
    if (n >= 280 && n <= 2560) {
      setViewportWidth(n);
      setTimeout(renderOverlay, 360);
    }
  }

  function reloadPage() {
    const frame = frameRef.current;
    if (!frame || !currentPage) return;
    frame.src = proxyHref(currentPage);
  }

  function cancelCaptured() {
    setCaptured(null);
    setComment("");
  }

  async function submitPin() {
    if (!captured) return;
    if (!comment.trim()) {
      toast.error("Add a comment");
      return;
    }

    let screenshotUrl: string | null = null;
    const frame = frameRef.current;
    const doc = frame?.contentDocument || frame?.contentWindow?.document || null;
    if (doc) {
      // Note: capture dataURL only, we don't upload to Supabase Storage
      // in v1. The DB column accepts a data: URL but for a stable kanban
      // thumbnail, this should later upload to a bucket. Skipped here to
      // ship the core loop.
      const dataUrl = await captureScreenshot(captured.el, doc);
      screenshotUrl = dataUrl;
    }

    startTransition(async () => {
      try {
        const pin = await createPin({
          page_url: currentPage,
          page_title: frame?.contentDocument?.title ?? null,
          selector_primary: captured.selectors[0],
          selector_fallback: captured.selectors.slice(1),
          element_tag: captured.tag,
          element_classes: captured.classes,
          element_text: captured.text,
          bounding_box: captured.boundingBox,
          comment,
          priority,
          element_context: {
            styles: captured.styles,
            parents: captured.parents,
          },
          viewport_width: captured.viewportWidth,
          screenshot_url: screenshotUrl,
        });
        toast.success("Pin saved");
        setPins((prev) => [pin, ...prev]);
        cancelCaptured();
        refreshFromServer();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  async function changeStatus(id: string, status: PinStatus) {
    startTransition(async () => {
      try {
        await updatePinStatus(id, status);
        setPins((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status } : p)),
        );
        if (selectedPin?.id === id) {
          setSelectedPin((sp) => (sp ? { ...sp, status } : sp));
        }
        toast.success(`Moved to ${status}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Update failed");
      }
    });
  }

  async function removePin(id: string) {
    if (!confirm("Delete this pin?")) return;
    startTransition(async () => {
      try {
        await deletePin(id);
        setPins((prev) => prev.filter((p) => p.id !== id));
        if (selectedPin?.id === id) setSelectedPin(null);
        toast.success("Pin deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }

  async function postReply(id: string, text: string) {
    if (!text.trim()) return;
    startTransition(async () => {
      try {
        await addPinReply(id, text);
        refreshFromServer();
        toast.success("Reply added");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Reply failed");
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col gap-3">
      {/* Toolbar */}
      <div className="panel flex flex-wrap items-center gap-3 px-3 py-2">
        <div className="flex items-center gap-2 display-eyebrow">
          <Crosshair className="h-3.5 w-3.5" aria-hidden />
          <span>
            Page review <span className="amber">{pinsOnPage.length}</span> notes
          </span>
          {pending && (
            <>
              <span aria-hidden className="text-[var(--ink-faint)]">·</span>
              <span className="amber">SYNCING</span>
            </>
          )}
        </div>

        <div className="h-5 w-px bg-[rgba(245,239,225,0.1)]" />

        <select
          value={currentPage}
          onChange={(e) => {
            setSelectedPin(null);
            setCaptured(null);
            setCurrentPage(e.target.value);
          }}
          className="rounded-md border border-[rgba(245,239,225,0.12)] bg-[rgba(7,9,15,0.6)] px-2 py-1 text-xs text-[var(--ink)] focus:border-[rgba(217,119,6,0.5)] focus:outline-none"
        >
          <option value="">Select a page…</option>
          {Object.entries(
            INSPECTOR_PAGES.reduce<Record<string, typeof INSPECTOR_PAGES>>(
              (acc, p) => {
                (acc[p.group] = acc[p.group] || []).push(p);
                return acc;
              },
              {},
            ),
          ).map(([group, list]) => (
            <optgroup key={group} label={group}>
              {list.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Viewport switcher */}
        <div className="flex items-center gap-1 rounded-md border border-[rgba(245,239,225,0.12)] bg-[rgba(7,9,15,0.6)] p-0.5">
          {VIEWPORT_PRESETS.map((p) => {
            const Icon = p.icon;
            const active =
              (p.value === "100%" && viewportWidth === null) ||
              (p.value !== "100%" && viewportWidth === parseInt(p.value, 10));
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => chooseViewport(p.value)}
                title={p.title}
                className={cn(
                  "grid h-7 w-7 place-items-center rounded transition-colors",
                  active
                    ? "bg-[rgba(217,119,6,0.18)] text-[var(--amber-soft)]"
                    : "text-[var(--ink-dim)] hover:text-[var(--ink)]",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
          <input
            type="number"
            placeholder="px"
            min={280}
            max={2560}
            value={customWidth}
            onChange={(e) => handleCustomWidth(e.target.value)}
            className="h-7 w-16 rounded border-0 bg-transparent px-1 text-xs text-[var(--ink)] focus:outline-none"
          />
        </div>

        {/* Inspect toggle */}
        <button
          type="button"
          onClick={() => setInspectMode((m) => !m)}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
            inspectMode
              ? "bg-[var(--amber)] text-[#1a1208] shadow-[0_0_14px_var(--amber-glow)]"
              : "border border-[rgba(245,239,225,0.12)] bg-[rgba(7,9,15,0.6)] text-[var(--ink-dim)] hover:text-[var(--ink)]",
          )}
        >
          <Crosshair className="h-3.5 w-3.5" />
          {inspectMode ? "Inspecting" : "Inspect"}
        </button>

        <button
          type="button"
          onClick={reloadPage}
          disabled={!currentPage}
          title="Reload the iframe"
          className="rounded-md border border-[rgba(245,239,225,0.12)] bg-[rgba(7,9,15,0.6)] p-1.5 text-[var(--ink-dim)] hover:text-[var(--ink)] disabled:opacity-40"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body: viewport + sidebar */}
      <div className="grid flex-1 min-h-0 grid-cols-1 gap-3 lg:grid-cols-[1fr_22rem]">
        {/* Viewport */}
        <div className="panel relative overflow-hidden">
          {!currentPage ? (
            <div className="grid h-full place-items-center text-center">
              <div className="space-y-2">
                <p className="display-eyebrow">Select a page</p>
                <p className="text-sm text-[var(--ink-dim)] max-w-xs">
                  Choose a HAND surface from the dropdown to load it in
                  page review.
                </p>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "relative h-full w-full",
                viewportWidth !== null && "overflow-auto bg-[rgba(7,9,15,0.6)]",
              )}
            >
              <div
                className="relative mx-auto h-full"
                style={{
                  width: viewportWidth !== null ? `${viewportWidth}px` : "100%",
                  maxWidth: "100%",
                }}
              >
                <iframe
                  ref={frameRef}
                  src={proxyHref(currentPage)}
                  onLoad={onIframeLoad}
                  className="h-full w-full border-0 bg-white"
                  // sandbox lets the inspector bridge inject scripts and
                  // read the DOM; we omit allow-top-navigation so the
                  // iframe can't navigate the host frame.
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                />
                <div
                  ref={overlayRef}
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{ overflow: "hidden" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="panel flex min-h-0 flex-col overflow-hidden">
          <header className="flex items-center justify-between border-b border-[rgba(245,239,225,0.06)] px-3 py-2">
            <span className="display-eyebrow">Feedback notes</span>
            <span className="display-stat text-base leading-none text-[var(--amber-soft)]">
              {pinsOnPage.length}
            </span>
          </header>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-1 border-b border-[rgba(245,239,225,0.06)] px-3 py-2">
            {(["all", ...PIN_STATUSES] as const).map((f) => {
              const active = statusFilter === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
                    active
                      ? "border border-[rgba(217,119,6,0.45)] bg-[rgba(217,119,6,0.16)] text-[var(--amber-soft)]"
                      : "border border-[rgba(245,239,225,0.1)] bg-transparent text-[var(--ink-dim)] hover:text-[var(--ink)]",
                  )}
                  aria-pressed={active}
                >
                  {f}
                </button>
              );
            })}
          </div>

          {/* Captured element / feedback form */}
          {captured && (
            <div className="border-b border-[rgba(245,239,225,0.06)] bg-[rgba(217,119,6,0.04)] px-3 py-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <code className="break-all rounded bg-[rgba(7,9,15,0.5)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--amber-soft)]">
                  {captured.selectors[0]}
                </code>
                <button
                  type="button"
                  onClick={cancelCaptured}
                  className="rounded p-1 text-[var(--ink-dim)] hover:text-[var(--ink)]"
                  aria-label="Cancel note"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-[var(--ink-dim)] line-clamp-2">
                {captured.text || `(${captured.tag}, no text)`}
              </p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe the change needed…"
                rows={3}
                className="w-full resize-none rounded-md border border-[rgba(245,239,225,0.12)] bg-[rgba(7,9,15,0.6)] px-2 py-1.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[rgba(217,119,6,0.5)] focus:outline-none"
                autoFocus
              />
              <div className="flex flex-wrap gap-1">
                {PIN_PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
                      priority === p
                        ? "border border-[rgba(217,119,6,0.45)] bg-[rgba(217,119,6,0.16)] text-[var(--amber-soft)]"
                        : "border border-[rgba(245,239,225,0.1)] text-[var(--ink-dim)] hover:text-[var(--ink)]",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={cancelCaptured}
                  className="rounded-md border border-[rgba(245,239,225,0.12)] px-3 py-1 text-xs text-[var(--ink-dim)] hover:text-[var(--ink)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitPin}
                  disabled={pending}
                  className="rounded-md bg-[var(--amber)] px-3 py-1 text-xs font-medium text-[#1a1208] hover:bg-[var(--amber-soft)] disabled:opacity-50"
                >
                  Save note
                </button>
              </div>
            </div>
          )}

          {/* Pin list */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
            {filteredPins.length === 0 && (
              <p className="px-2 py-8 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">
                {pinsOnPage.length === 0 ? "NO NOTES YET" : "NONE MATCH FILTER"}
              </p>
            )}
            <ul className="space-y-2">
              {filteredPins.map((pin) => (
                <PinSidebarCard
                  key={pin.id}
                  pin={pin}
                  number={pinsOnPage.indexOf(pin) + 1}
                  selected={selectedPin?.id === pin.id}
                  onSelect={() => {
                    setSelectedPin(pin);
                    scrollIntoPin(pin);
                  }}
                  onStatus={(s) => changeStatus(pin.id, s)}
                  onDelete={() => removePin(pin.id)}
                  onReply={(text) => postReply(pin.id, text)}
                />
              ))}
            </ul>
          </div>

          {/* Live CSS editor (selected pin) */}
          {selectedPin && (
            <CssEditor
              pin={selectedPin}
              frameRef={frameRef}
              onClose={() => setSelectedPin(null)}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function PinSidebarCard({
  pin,
  number,
  selected,
  onSelect,
  onStatus,
  onDelete,
  onReply,
}: {
  pin: FeedbackPin;
  number: number;
  selected: boolean;
  onSelect: () => void;
  onStatus: (s: PinStatus) => void;
  onDelete: () => void;
  onReply: (text: string) => void;
}) {
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const priorityColor: Record<PinPriority, string> = {
    low: "text-[var(--ink-dim)]",
    normal: "text-[var(--ink)]",
    high: "text-[var(--amber-soft)]",
    critical: "text-[#fda4a4]",
  };
  return (
    <li
      onClick={onSelect}
      className={cn(
        "cursor-pointer rounded-md border bg-[rgba(7,9,15,0.55)] p-2.5 transition-colors",
        selected
          ? "border-[rgba(217,119,6,0.45)] shadow-[0_0_12px_rgba(217,119,6,0.18)]"
          : "border-[rgba(245,239,225,0.07)] hover:border-[rgba(217,119,6,0.25)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[rgba(217,119,6,0.18)] font-mono text-[10px] text-[var(--amber-soft)]">
            {number}
          </span>
          <code className="truncate font-mono text-[10px] text-[var(--ink-dim)]">
            {pin.selector_primary}
          </code>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded p-1 text-[var(--ink-faint)] hover:text-[#fda4a4]"
          aria-label="Delete note"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <p className="mt-1.5 text-xs text-[var(--ink)] line-clamp-3">{pin.comment}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
        <select
          value={pin.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onStatus(e.target.value as PinStatus)}
          className="rounded border border-[rgba(245,239,225,0.1)] bg-[rgba(7,9,15,0.6)] px-1 py-0.5 text-[10px] text-[var(--ink)] focus:outline-none"
        >
          {PIN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className={cn("font-mono", priorityColor[pin.priority])}>
          {pin.priority}
        </span>
        {pin.viewport_width && <span>{pin.viewport_width}px</span>}
        <span>{timeAgo(pin.created_at)}</span>
      </div>
      {pin.thread.length > 0 && (
        <ul className="mt-2 space-y-1 border-l border-[rgba(245,239,225,0.08)] pl-2">
          {pin.thread.map((r, i) => (
            <li key={i} className="text-xs text-[var(--ink-dim)]">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                {r.author}
              </span>{" "}
              · {r.text}
            </li>
          ))}
        </ul>
      )}
      {replying ? (
        <div
          className="mt-2 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onReply(reply);
                setReply("");
                setReplying(false);
              } else if (e.key === "Escape") {
                setReplying(false);
              }
            }}
            placeholder="Reply…"
            autoFocus
            className="flex-1 rounded border border-[rgba(245,239,225,0.12)] bg-[rgba(7,9,15,0.6)] px-1.5 py-0.5 text-xs focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              onReply(reply);
              setReply("");
              setReplying(false);
            }}
            className="rounded bg-[var(--amber)] px-2 py-0.5 text-xs text-[#1a1208]"
          >
            Send
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setReplying(true);
          }}
          className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)] hover:text-[var(--ink-dim)]"
        >
          <CornerDownRight className="h-3 w-3" /> Reply
        </button>
      )}
    </li>
  );
}

function CssEditor({
  pin,
  frameRef,
  onClose,
}: {
  pin: FeedbackPin;
  frameRef: React.RefObject<HTMLIFrameElement | null>;
  onClose: () => void;
}) {
  // Resolve the element each render; if the iframe reloaded, the element
  // reference would be stale. We compute it here in a memo keyed on the
  // pin id + the iframe ref's current.
  const [values, setValues] = useState<Record<string, string>>({});
  const [originals, setOriginals] = useState<Record<string, string>>({});

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let doc: Document | null = null;
    try {
      doc = frame.contentDocument || frame.contentWindow?.document || null;
    } catch {
      return;
    }
    if (!doc) return;
    const el = findElement(doc, pin.selector_primary, pin.selector_fallback);
    if (!el) return;
    const win = doc.defaultView!;
    const computed = win.getComputedStyle(el);
    const orig: Record<string, string> = {};
    for (const prop of STYLE_PROPS) {
      orig[prop] = computed.getPropertyValue(prop);
    }
    setOriginals(orig);
    setValues({ ...orig, ...(pin.css_overrides ?? {}) });
  }, [pin.id, pin.selector_primary, pin.selector_fallback, pin.css_overrides, frameRef]);

  function applyValue(prop: string, val: string) {
    const frame = frameRef.current;
    if (!frame) return;
    let doc: Document | null = null;
    try {
      doc = frame.contentDocument || frame.contentWindow?.document || null;
    } catch {
      return;
    }
    if (!doc) return;
    const el = findElement(
      doc,
      pin.selector_primary,
      pin.selector_fallback,
    ) as HTMLElement | null;
    if (!el) return;
    el.style.setProperty(prop, val, "important");
    setValues((v) => ({ ...v, [prop]: val }));
  }

  function resetAll() {
    const frame = frameRef.current;
    if (!frame) return;
    let doc: Document | null = null;
    try {
      doc = frame.contentDocument || frame.contentWindow?.document || null;
    } catch {
      return;
    }
    if (!doc) return;
    const el = findElement(
      doc,
      pin.selector_primary,
      pin.selector_fallback,
    ) as HTMLElement | null;
    if (!el) return;
    for (const prop of STYLE_PROPS) {
      el.style.removeProperty(prop);
    }
    setValues({ ...originals });
  }

  return (
    <div className="border-t border-[rgba(245,239,225,0.06)] bg-[rgba(7,9,15,0.6)] p-3 space-y-2 max-h-72 overflow-y-auto">
      <div className="flex items-center justify-between">
        <span className="display-eyebrow">Style editor</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={resetAll}
            className="rounded border border-[rgba(245,239,225,0.12)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-dim)] hover:text-[var(--ink)]"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--ink-dim)] hover:text-[var(--ink)]"
            aria-label="Close editor"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
        Changes apply only to your session. Not saved to source.
      </p>
      <div className="space-y-1">
        {STYLE_PROPS.map((prop) => {
          const v = values[prop] ?? "";
          const o = originals[prop] ?? "";
          const changed = v !== o;
          return (
            <div key={prop} className="flex items-center gap-2">
              <span className="w-28 shrink-0 truncate font-mono text-[10px] text-[var(--ink-dim)]">
                {prop}
              </span>
              <input
                value={v}
                onChange={(e) => applyValue(prop, e.target.value)}
                className={cn(
                  "flex-1 rounded border bg-[rgba(7,9,15,0.6)] px-1.5 py-0.5 font-mono text-[10px]",
                  changed
                    ? "border-[rgba(217,119,6,0.45)] text-[var(--amber-soft)]"
                    : "border-[rgba(245,239,225,0.1)] text-[var(--ink)]",
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
