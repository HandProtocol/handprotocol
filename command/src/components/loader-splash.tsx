"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Minimum time the loader stays visible so the artwork isn't robbed by
// a fast localhost render. PRD section 9 calls for 1.4s.
const MIN_DWELL_MS = 1400;

/*
  Full-bleed splash. Mounts the existing 3D loader (loading.html) inside a
  hidden-chrome iframe, prefetches /dashboard, then redirects once both
  conditions are met: dwell elapsed AND dashboard ready.

  We keep loading.html untouched so the loader can also be opened standalone
  for QA. The handoff lives entirely on the React side.
*/
export function LoaderSplash() {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const handoffFiredRef = useRef(false);

  useEffect(() => {
    // Kick off route prefetch immediately. Even if Next.js has already
    // prefetched it via Link discovery, this is cheap and idempotent.
    try {
      router.prefetch("/dashboard");
    } catch {
      // Older client variants may not expose prefetch in this context.
      // Ignore. The navigation below still works.
    }

    const start = performance.now();

    function tryHandoff() {
      if (handoffFiredRef.current) return;
      handoffFiredRef.current = true;
      const elapsed = performance.now() - start;
      const wait = Math.max(0, MIN_DWELL_MS - elapsed);
      window.setTimeout(() => {
        setHidden(true);
        // Use replace so back-button doesn't return to the loader.
        router.replace("/dashboard");
      }, wait);
    }

    // Wait for the page to finish initial work (network idle-ish) before
    // committing to the handoff. If load fires first we use that; otherwise
    // a 2.5s safety net catches stalled environments.
    if (document.readyState === "complete") {
      tryHandoff();
    } else {
      window.addEventListener("load", tryHandoff, { once: true });
    }
    const safety = window.setTimeout(tryHandoff, 2500);

    return () => {
      window.clearTimeout(safety);
      window.removeEventListener("load", tryHandoff);
    };
  }, [router]);

  return (
    <div
      aria-hidden={hidden}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg)",
        zIndex: 50,
        opacity: hidden ? 0 : 1,
        transition: "opacity 420ms ease",
        pointerEvents: hidden ? "none" : "auto",
      }}
    >
      <iframe
        src="/loading.html"
        title="HAND Command Center loader"
        // The loader is self-contained; no scrollbars, no nav.
        style={{
          width: "100%",
          height: "100%",
          border: 0,
          display: "block",
        }}
      />
    </div>
  );
}
