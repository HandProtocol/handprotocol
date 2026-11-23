"use client";

import type { CSSProperties } from "react";
import type { Door } from "./contact-modal";
import { CompassRose, Mark, MoonBand, PrinciplesWheel, SeasonsWheel, type Glyph } from "./almanac/ornaments";
import { GATHERINGS, LAND, PRINCIPLES, VISION, type ChapterKey } from "./copy";
import { FocusTitle, Leaf } from "./sheet";

// The four chapters as almanac leaves. Each part carries `order`: on a phone the two pages melt
// into one, and the order sets where each part falls (title first, art after the words).
const o = (order: number): CSSProperties => ({ order });

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
const VOW_MARKS: Glyph[] = ["flameheart", "circle-of", "sunrise"];
const SPACE_GLYPHS: Glyph[] = ["g-healing", "g-main", "g-yurt", "g-yurts", "g-pool", "g-bath", "g-lawn"];

// The first letter set apart as a capital, the rest of the word running on; the whole word
// stays whole for screen readers.
function Opening({ text, className }: { text: string; className: string }) {
  return (
    <>
      <span className={className} aria-hidden="true">
        {text[0]}
      </span>
      <span className="al-vh">{text[0]}</span>
      {text.slice(1)}
    </>
  );
}

function Vision() {
  const [first, ...rest] = VISION.body;
  return (
    <Leaf
      id="vision"
      tone="vellum"
      heads={["Mystic Hearts Healing Collective", "East Austin, Texas"]}
      folio={["i", "ii"]}
      verso={
        <>
          <figure className="al-frontis" style={o(2)}>
            <Mark id="flameheart" className="al-apex" />
            <div className="al-arch">
              <img src="/assets/images/hero-pergola-poster.jpg" alt="The pergola strung with lights at dusk, the lawn beyond" width={1280} height={720} />
            </div>
            <figcaption>The pergola at dusk</figcaption>
          </figure>
          <ul className="al-vows" aria-label="Our tagline" style={o(5)}>
            {VISION.tagline.map((line, i) => (
              <li key={line}>
                <Mark id={VOW_MARKS[i] ?? "star4"} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </>
      }
      recto={
        <>
          <div className="al-title-block" style={o(1)}>
            <p className="al-kicker">{VISION.kicker}</p>
            <FocusTitle>
              {VISION.title[0]}
              <span className="al-subtitle">{VISION.title[1]}</span>
            </FocusTitle>
          </div>
          <div className="al-body" style={o(3)}>
            <p>
              <Opening text={first} className="al-illum" />
            </p>
            {rest.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <blockquote className="al-quote" style={o(4)}>
            {VISION.quote}
          </blockquote>
          <p className="al-colophon" style={o(6)}>
            <Mark id="flameheart" />
            {VISION.footnote}
          </p>
        </>
      }
    />
  );
}

function Principles() {
  return (
    <Leaf
      id="principles"
      heads={["Mystic Hearts Healing Collective", "How we live"]}
      folio={["iii", "iv"]}
      verso={
        <>
          <div style={o(1)}>
            <p className="al-kicker">{PRINCIPLES.kicker}</p>
            <FocusTitle>{PRINCIPLES.title}</FocusTitle>
          </div>
          <p className="al-lede" style={o(2)}>
            {PRINCIPLES.lede}
          </p>
          <div className="al-wheel-wrap" style={o(3)}>
            <PrinciplesWheel />
            <p className="al-wheel-note">Nine principles, one circle</p>
          </div>
        </>
      }
      recto={
        <ol className="al-covenant" style={o(4)}>
          {PRINCIPLES.items.map(([name, meaning], i) => (
            <li key={name}>
              <span className="al-num" aria-hidden="true">
                {NUMERALS[i]}
              </span>
              <span className="al-name">{name}</span>
              <span className="al-meaning">{meaning}</span>
            </li>
          ))}
        </ol>
      }
    />
  );
}

function Land({ onVisit }: { onVisit: () => void }) {
  return (
    <Leaf
      id="land"
      heads={["Mystic Hearts Healing Collective", "The land"]}
      folio={["v", "vi"]}
      verso={
        <>
          <div style={o(1)}>
            <p className="al-kicker">{LAND.kicker}</p>
            <FocusTitle>
              A sacred home on <span className="al-fig">10</span> acres
            </FocusTitle>
          </div>
          <p className="al-lede" style={o(2)}>
            {LAND.lede}
          </p>
          <div className="al-rose" style={o(5)}>
            <CompassRose />
            <p className="al-wheel-note">East Austin, Texas. The address comes with your visit.</p>
          </div>
        </>
      }
      recto={
        <>
          <div className="al-legend" style={o(3)}>
            <p className="al-legend-head">
              <Mark id="mesquite" />
              Legend
            </p>
            <ul>
              {LAND.spaces.map(([name, use], i) => (
                <li key={name}>
                  <Mark id={SPACE_GLYPHS[i] ?? "star4"} className="al-glyph" />
                  <span className="al-name">{name}</span>
                  <span className="al-use">{use}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="al-actions" style={o(4)}>
            <button className="al-btn al-btn--rubric" type="button" onClick={onVisit}>
              <Mark id="mk-compass" />
              Walk the land with us
            </button>
          </div>
        </>
      }
    />
  );
}

function Gatherings({ onCalendar, onVisit, onHello }: { onCalendar: () => void; onVisit: () => void; onHello: () => void }) {
  return (
    <Leaf
      id="gatherings"
      heads={["Mystic Hearts Healing Collective", "Gatherings"]}
      folio={["vii", "viii"]}
      verso={
        <>
          <div style={o(0)}>
            <MoonBand />
          </div>
          <div style={o(1)}>
            <p className="al-kicker">{GATHERINGS.kicker}</p>
            <FocusTitle>{GATHERINGS.title}</FocusTitle>
          </div>
          <p className="al-lede" style={o(2)}>
            <Opening text={GATHERINGS.lede} className="al-rubric-cap" />
          </p>
          <div className="al-seasons" style={o(3)}>
            <SeasonsWheel />
            <div>
              <p className="al-note-big">
                First gatherings open <em>fall <span className="al-fig">2027</span>.</em>
              </p>
              <p className="al-note-small">The calendar fills from bookings on the land.</p>
            </div>
          </div>
        </>
      }
      recto={
        <>
          <div className="al-offerings" style={o(4)}>
            <p className="al-legend-head">The offerings</p>
            <ol>
              {GATHERINGS.kinds.map((kind) => (
                <li key={kind}>
                  <Mark id="star4" />
                  {kind}
                </li>
              ))}
            </ol>
          </div>
          <div className="al-calendar-door" style={o(5)}>
            <p className="al-h3">The calendar</p>
            <p className="al-hint">Gatherings and open days, as they come.</p>
            <button className="al-btn al-btn--rubric" type="button" onClick={onCalendar}>
              <Mark id="mk-moon" />
              Open the calendar
            </button>
          </div>
          <div className="al-host" style={o(6)}>
            <h3 className="al-h3">{GATHERINGS.hosts.title}</h3>
            <p>{GATHERINGS.hosts.body}</p>
            <div className="al-actions">
              <button className="al-btn al-btn--ruled" type="button" onClick={onVisit}>
                Request the land
              </button>
              <button className="al-btn al-btn--ruled" type="button" onClick={onHello}>
                Ask a question
              </button>
            </div>
          </div>
        </>
      }
    />
  );
}

// The open chapter's leaf; the book around it is AlmanacSheet.
export function ChapterLeaf({ chapter, onDoor }: { chapter: ChapterKey; onDoor: (door: Door) => void }) {
  if (chapter === "principles") return <Principles />;
  if (chapter === "land") return <Land onVisit={() => onDoor("visit")} />;
  if (chapter === "gatherings") return <Gatherings onCalendar={() => onDoor("whatson")} onVisit={() => onDoor("visit")} onHello={() => onDoor("hello")} />;
  return <Vision />;
}
