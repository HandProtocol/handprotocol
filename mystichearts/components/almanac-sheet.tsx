"use client";

import { useState } from "react";
import { DoorLeaf, type Door } from "./contact-modal";
import { CHAPTERS, type ChapterKey } from "./copy";
import { Sheet, type Turns } from "./sheet";
import { SiteNav } from "./site-nav";
import { ChapterLeaf } from "./story-sheet";

// The whole almanac as one book: the four chapters, then the calendar (with the visit as its
// second way), then Say hello. The folios already run i to xii in this order; turning past the
// last chapter opens the calendar, and back from the calendar returns to Gatherings.
type PageKey = ChapterKey | "whatson" | "hello";

const BOOK: { key: PageKey; label: string }[] = [
  ...CHAPTERS.map((c, i) => ({ key: c.key as PageKey, label: `${["I", "II", "III", "IV"][i]}. ${c.label}` })),
  { key: "whatson", label: "The calendar" },
  { key: "hello", label: "Say hello" },
];

export function AlmanacSheet({
  chapter,
  door,
  onChapter,
  onDoor,
  onClose,
  fallbackEmail,
}: {
  chapter: ChapterKey | null;
  door: Door | null;
  onChapter: (key: ChapterKey) => void;
  onDoor: (door: Door) => void;
  onClose: () => void;
  fallbackEmail: string;
}) {
  // The day chosen on the calendar, carried into the visit way, and the note Say hello opens
  // with when the calendar's host button sent the visitor; both forgotten when the book closes.
  const [visitDate, setVisitDate] = useState<string | null>(null);
  const [helloSeed, setHelloSeed] = useState<string | undefined>(undefined);

  const open = chapter !== null || door !== null;
  const key: PageKey = chapter ?? (door === "hello" ? "hello" : door ? "whatson" : "vision");
  const index = BOOK.findIndex((p) => p.key === key);

  const goTo = (to: PageKey) => {
    if (to === "whatson" || to === "hello") onDoor(to);
    else onChapter(to);
  };
  const turns: Turns = {
    prev: index > 0 ? { label: BOOK[index - 1].label, go: () => goTo(BOOK[index - 1].key) } : undefined,
    next: index < BOOK.length - 1 ? { label: BOOK[index + 1].label, go: () => goTo(BOOK[index + 1].key) } : undefined,
  };

  const close = () => {
    setVisitDate(null);
    setHelloSeed(undefined);
    onClose();
  };
  // a door picked from the nav starts that door fresh
  const navDoor = (next: Door) => {
    setVisitDate(null);
    onDoor(next);
  };

  return (
    <Sheet
      open={open}
      label={chapter ? "About Mystic Hearts" : "Get in touch"}
      page={{ key, index }}
      turns={turns}
      onClose={close}
      tabs={<SiteNav chapter={chapter} door={chapter ? null : door} onChapter={onChapter} onDoor={navDoor} />}
    >
      {chapter ? (
        <ChapterLeaf chapter={chapter} onDoor={onDoor} />
      ) : (
        <DoorLeaf
          door={door ?? "hello"}
          onSwitch={onDoor}
          fallbackEmail={fallbackEmail}
          visitDate={visitDate}
          setVisitDate={setVisitDate}
          helloSeed={helloSeed}
          setHelloSeed={setHelloSeed}
        />
      )}
    </Sheet>
  );
}
