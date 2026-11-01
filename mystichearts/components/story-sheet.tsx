"use client";

import { ArrowUpRight, CalendarDays } from "lucide-react";
import { CHAPTERS, GATHERINGS, LAND, PRINCIPLES, VISION, type ChapterKey } from "./copy";
import { FocusTitle, Sheet, SheetPanel, SheetTabs } from "./sheet";

function Vision() {
  return (
    <>
      <p className="modal-kicker">{VISION.kicker}</p>
      <FocusTitle>
        {VISION.title[0]} <em className="line">{VISION.title[1]}</em>
      </FocusTitle>
      <div className="prose">
        {VISION.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <blockquote className="pull">{VISION.quote}</blockquote>
      <p className="tagline">
        {VISION.tagline.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </p>
      <p className="fine">{VISION.footnote}</p>
    </>
  );
}

function Principles() {
  return (
    <>
      <p className="modal-kicker">{PRINCIPLES.kicker}</p>
      <FocusTitle>{PRINCIPLES.title}</FocusTitle>
      <p className="modal-lede">{PRINCIPLES.lede}</p>
      <ol className="principles">
        {PRINCIPLES.items.map(([name, meaning], i) => (
          <li key={name}>
            <span className="num">{String(i + 1).padStart(2, "0")}</span>
            <span className="name">{name}</span>
            <span className="meaning">{meaning}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

function Land({ onVisit }: { onVisit: () => void }) {
  return (
    <>
      <p className="modal-kicker">{LAND.kicker}</p>
      <FocusTitle>{LAND.title}</FocusTitle>
      <p className="modal-lede">{LAND.lede}</p>
      <ul className="spaces">
        {LAND.spaces.map(([name, use]) => (
          <li key={name}>
            <span className="name">{name}</span>
            <span className="meaning">{use}</span>
          </li>
        ))}
      </ul>
      <div className="door-actions">
        <button className="btn btn-gold" type="button" onClick={onVisit}>
          <CalendarDays size={18} />
          Walk the land with us
        </button>
      </div>
    </>
  );
}

function Gatherings({ onVisit, onHello }: { onVisit: () => void; onHello: () => void }) {
  return (
    <>
      <p className="modal-kicker">{GATHERINGS.kicker}</p>
      <FocusTitle>{GATHERINGS.title}</FocusTitle>
      <p className="modal-lede">{GATHERINGS.lede}</p>
      <ul className="kinds">
        {GATHERINGS.kinds.map((kind) => (
          <li key={kind}>{kind}</li>
        ))}
      </ul>
      <p className="fine">{GATHERINGS.note}</p>
      <div className="host">
        <h3>{GATHERINGS.hosts.title}</h3>
        <p>{GATHERINGS.hosts.body}</p>
        <div className="door-actions">
          <button className="btn btn-gold" type="button" onClick={onVisit}>
            Request the land
            <ArrowUpRight size={18} />
          </button>
          <button className="btn btn-glass" type="button" onClick={onHello}>
            Ask a question
          </button>
        </div>
      </div>
    </>
  );
}

export function StorySheet({
  chapter,
  onClose,
  onSwitch,
  onVisit,
  onHello,
}: {
  chapter: ChapterKey | null;
  onClose: () => void;
  onSwitch: (key: ChapterKey) => void;
  onVisit: () => void;
  onHello: () => void;
}) {
  const current = chapter ?? "vision";
  return (
    <Sheet open={chapter !== null} label="About Mystic Hearts" onClose={onClose} tabs={<SheetTabs items={CHAPTERS} current={current} onPick={onSwitch} label="Chapters" />}>
      <SheetPanel id={current}>
        {current === "vision" && <Vision />}
        {current === "principles" && <Principles />}
        {current === "land" && <Land onVisit={onVisit} />}
        {current === "gatherings" && <Gatherings onVisit={onVisit} onHello={onHello} />}
      </SheetPanel>
    </Sheet>
  );
}
