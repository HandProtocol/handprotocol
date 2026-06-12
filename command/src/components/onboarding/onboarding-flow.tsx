"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  Compass,
  Eye,
  Inbox,
  Library,
  Megaphone,
  MessageSquare,
  Rocket,
  Scroll,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { CommandRole } from "@/lib/supabase/profile";
import {
  ONBOARDING_FLAG,
  greetName,
  journeyFor,
  type IconKey,
} from "@/lib/onboarding/journeys";
import { bloom, burst, letterCycle, revealCascade } from "@/lib/motion/anime";

/*
  Role-aware first-run onboarding overlay. See docs/ONBOARDING.md.

  Mounts in the (dashboard) layout, which already resolves the operator's role.
  Renders nothing once the operator has been oriented (localStorage flag) or when
  onboarding is disabled (no active profile). On first run it boots the HUD,
  reveals the role's pillar + map, and blooms into the first action.

  All motion is reduced-motion safe via the helpers in lib/motion/anime.
*/

const ICONS: Record<IconKey, LucideIcon> = {
  inbox: Inbox,
  scroll: Scroll,
  calendar: Calendar,
  library: Library,
  users: Users,
  rocket: Rocket,
  megaphone: Megaphone,
  target: Target,
  message: MessageSquare,
  eye: Eye,
  compass: Compass,
};

export function OnboardingFlow({
  enabled,
  role,
  displayName,
  group,
}: {
  enabled: boolean;
  role: CommandRole;
  displayName: string | null;
  group: string | null;
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const bootRef = useRef<HTMLSpanElement>(null);
  const tilesRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);

  const journey = useMemo(
    () => journeyFor(role, { displayName, group }),
    [role, displayName, group],
  );

  // Decide visibility on the client (localStorage is client-only).
  useEffect(() => {
    if (!enabled) return;
    try {
      if (localStorage.getItem(ONBOARDING_FLAG)) return;
    } catch {
      /* storage blocked → just show once this session */
    }
    setShow(true);
  }, [enabled]);

  // Boot sequence once visible: letterCycle the eyebrow, then reveal the map.
  useEffect(() => {
    if (!show) return;
    const stopCycle = bootRef.current
      ? letterCycle(bootRef.current, journey.boot, 520)
      : undefined;
    const settle = window.setTimeout(() => {
      stopCycle?.();
      if (bootRef.current) bootRef.current.textContent = `${journey.stage} · ONLINE`;
    }, 1700);

    const tiles = tilesRef.current?.querySelectorAll<HTMLElement>("[data-tile]");
    const raf = window.requestAnimationFrame(() => {
      if (tiles && tiles.length) revealCascade(tiles);
    });
    // Insurance: if anything blocks the reveal, force tiles visible.
    const safety = window.setTimeout(() => {
      tiles?.forEach((t) => (t.style.opacity = "1"));
    }, 1200);

    return () => {
      stopCycle?.();
      window.clearTimeout(settle);
      window.clearTimeout(safety);
      window.cancelAnimationFrame(raf);
    };
  }, [show, journey]);

  const finish = useCallback(
    (href?: string, celebrate = false) => {
      if (closing.current) return;
      closing.current = true;
      try {
        localStorage.setItem(ONBOARDING_FLAG, new Date().toISOString());
      } catch {
        /* ignore */
      }
      if (href) {
        if (celebrate && ctaRef.current) burst(ctaRef.current, 28);
        if (rootRef.current) bloom(rootRef.current);
        window.setTimeout(() => {
          setShow(false);
          router.push(href);
        }, 640);
      } else {
        setShow(false);
      }
    },
    [router],
  );

  // Esc skips.
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, finish]);

  if (!show) return null;

  const name = greetName(displayName);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Command Center orientation"
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-[rgba(7,9,15,0.94)] px-4 backdrop-blur-xl"
      style={{
        backgroundImage:
          "radial-gradient(60% 60% at 50% 38%, rgba(217,119,6,0.10), transparent 70%), linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)",
        backgroundSize: "auto, 56px 56px, 56px 56px",
      }}
    >
      {/* HUD corner brackets frame the boot surface */}
      <div className="hud-bracket hud-bracket-tl" />
      <div className="hud-bracket hud-bracket-tr" />
      <div className="hud-bracket hud-bracket-bl" />
      <div className="hud-bracket hud-bracket-br" />

      {/* Decorative concentric ring (stage motif) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full border border-[var(--hud)] opacity-40"
      >
        <div className="absolute inset-6 rounded-full border border-dashed border-[rgba(217,119,6,0.35)]" />
        <div className="absolute inset-16 rounded-full border border-[var(--hud)]" />
      </div>

      <div className="panel relative w-full max-w-[560px] rounded-xl border border-[var(--hud)] bg-[var(--bg-2)] p-7 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.8)] sm:p-9">
        <span ref={bootRef} className="eyebrow amber block">
          INITIALIZING
        </span>

        <h1 className="mt-3 text-[clamp(1.5rem,2.4vw,2rem)] font-bold tracking-[-0.025em] text-[var(--ink)]">
          Welcome, {name}.
        </h1>
        <p className="mt-2 max-w-[46ch] text-[0.9375rem] leading-[1.6] text-[var(--ink-dim)]">
          {journey.identity}
        </p>

        <hr className="my-6 border-0 border-t border-[var(--hud)]" />

        <div>
          <span className="eyebrow text-[var(--ink-faint)]">Your pillar</span>
          <p className="mt-1.5 text-[0.9375rem] leading-[1.55] text-[var(--ink)]">
            {journey.pillar}
          </p>
        </div>

        <div className="mt-6">
          <span className="eyebrow text-[var(--ink-faint)]">Your map</span>
          <div ref={tilesRef} className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {journey.map.map((tile) => {
              const Icon = ICONS[tile.icon] ?? Compass;
              return (
                <button
                  key={tile.href + tile.label}
                  data-tile
                  type="button"
                  onClick={() => finish(tile.href)}
                  style={{ opacity: 0 }}
                  className="group flex items-start gap-3 rounded-lg border border-[var(--hud)] bg-[rgba(7,9,15,0.4)] p-3 text-left transition-colors hover:border-[var(--amber)] hover:bg-[rgba(217,119,6,0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--amber-soft)]"
                >
                  <Icon
                    size={18}
                    strokeWidth={1.8}
                    className="mt-0.5 shrink-0 text-[var(--amber)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-[0.875rem] font-medium text-[var(--ink)]">
                      {tile.label}
                    </span>
                    <span className="block text-[0.75rem] text-[var(--ink-dim)]">
                      {tile.sub}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            ref={ctaRef}
            type="button"
            onClick={() => finish(journey.firstMove.href, true)}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--amber)] px-4 py-2.5 text-[0.9375rem] font-semibold text-[var(--bg)] shadow-[0_0_0_0_rgba(217,119,6,0.4)] transition-[background,box-shadow] hover:bg-[var(--amber-soft)] hover:shadow-[0_6px_24px_-4px_rgba(217,119,6,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-2)] focus-visible:ring-[var(--amber-soft)]"
          >
            {journey.firstMove.label}
            <ArrowRight size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => finish()}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2.5 text-[0.875rem] text-[var(--ink-dim)] transition-colors hover:text-[var(--ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--amber-soft)]"
          >
            Skip
            <kbd className="rounded border border-[var(--hud)] px-1.5 py-0.5 font-mono text-[0.625rem] tracking-wider text-[var(--ink-faint)]">
              ESC
            </kbd>
          </button>
        </div>

        <p className="eyebrow mt-7 text-[var(--ink-faint)]">
          HAND COMMAND · OPERATOR HUD
        </p>
      </div>
    </div>
  );
}
