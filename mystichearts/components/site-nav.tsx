"use client";

import { CalendarDays, Feather, Footprints } from "lucide-react";
import type { ReactNode } from "react";
import type { Door } from "./contact-modal";
import { CHAPTERS, type ChapterKey } from "./copy";

// The one nav at the top of every sheet: the four chapters as one pill, and the three doors
// (calendar, a visit, a note) as a second pill set beside it, so the two kinds of place read apart.
const DOORS: { key: Door; label: string; icon: ReactNode }[] = [
  { key: "whatson", label: "Calendar", icon: <CalendarDays size={15} /> },
  { key: "visit", label: "Visit the land", icon: <Footprints size={15} /> },
  { key: "hello", label: "Say hello", icon: <Feather size={15} /> },
];

export function SiteNav({
  chapter,
  door,
  onChapter,
  onDoor,
}: {
  chapter: ChapterKey | null;
  door: Door | null;
  onChapter: (key: ChapterKey) => void;
  onDoor: (key: Door) => void;
}) {
  return (
    <nav className="modal-nav" aria-label="Mystic Hearts">
      <div className="modal-doors" role="tablist" aria-label="About the collective">
        {CHAPTERS.map((item) => (
          <button key={item.key} role="tab" aria-selected={chapter === item.key} className="door-tab" onClick={() => onChapter(item.key)} type="button">
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="modal-doors addon" role="tablist" aria-label="Come to the land">
        {DOORS.map((item) => (
          <button key={item.key} role="tab" aria-selected={door === item.key} className="door-tab" onClick={() => onDoor(item.key)} type="button">
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
