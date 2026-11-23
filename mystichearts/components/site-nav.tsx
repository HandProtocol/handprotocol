"use client";

import type { Door } from "./contact-modal";
import { Mark, type Glyph } from "./almanac/ornaments";
import { CHAPTERS, type ChapterKey } from "./copy";

// The one nav under every sheet, almanac nav style 1: the four chapters as ribbon bookmarks
// hanging from under the leaf (the open one in raspberry), and the three doors (calendar, a
// visit, a note) as a band beside them on a wide screen, below them on a phone. Visit the land
// is the stamped door; the open door carries a gold rule along its foot.
const NUMERALS = ["I", "II", "III", "IV"];

const DOORS: { key: Door; label: string; mark: Glyph }[] = [
  { key: "whatson", label: "Calendar", mark: "mk-moon" },
  { key: "visit", label: "Visit the land", mark: "mk-compass" },
  { key: "hello", label: "Say hello", mark: "flameheart" },
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
    <nav className="al-nav" aria-label="Mystic Hearts">
      <ul className="al-acts" aria-label="Come to the land">
        {DOORS.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              className={item.key === "visit" ? "al-act al-act--primary" : "al-act"}
              aria-current={door === item.key ? "true" : undefined}
              onClick={() => onDoor(item.key)}
            >
              <Mark id={item.mark} className="al-act-mark" />
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <ol className="al-ribbons" aria-label="The four chapters">
        {CHAPTERS.map((item, i) => (
          <li key={item.key}>
            <button type="button" className="al-ribbon" aria-current={chapter === item.key ? "page" : undefined} onClick={() => onChapter(item.key)}>
              <span className="al-ribbon-n" aria-hidden="true">
                {NUMERALS[i]}
              </span>
              <span className="al-ribbon-t">{item.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
