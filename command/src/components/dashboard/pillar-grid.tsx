"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { revealCascade } from "@/lib/motion/anime";

/*
  Dashboard pillar grid. Renders the four H-A-N-D tiles with the
  pillar-tile chrome plus a reveal cascade on mount.
*/

export type PillarStats = {
  letter: string;
  word: string;
  line: string;
  detail: string;
  primaryStat: string;
  primaryStatLabel: string;
  href: string;
};

export function PillarGrid({ pillars }: { pillars: PillarStats[] }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const tiles = ref.current.querySelectorAll<HTMLElement>(".pillar-tile");
    revealCascade(tiles);
  }, []);

  return (
    <div
      ref={ref}
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      {pillars.map((p) => (
        <Link
          key={p.letter}
          href={p.href}
          className="pillar-tile group block"
          style={{ opacity: 0 }}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="pillar-tile__letter">{p.letter}</span>
            <div className="text-right">
              <span className="pillar-tile__stat block text-xl leading-none">
                {p.primaryStat}
              </span>
              <span className="pillar-tile__eyebrow block mt-1">
                {p.primaryStatLabel}
              </span>
            </div>
          </div>

          <p className="pillar-tile__eyebrow mt-4">{p.line}</p>
          <h3 className="mt-1 text-lg font-medium tracking-tight text-[var(--ink)]">
            {p.word}
          </h3>
          <p className="mt-2 text-sm text-[var(--ink-dim)] leading-relaxed">
            {p.detail}
          </p>
        </Link>
      ))}
    </div>
  );
}
