"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { FAIRY_BALL, EVENT_PAGES, eventPageFor } from "./events";
import { KOHSI_KEY, KOHSI_URL } from "./kohsi-booking";

// "Happening soon" on the stage: the next gatherings Kohsi has listed for the collective
// (GET /v1/gatherings, the same list the What's on board shows), led by any gathering with its
// own page here (the Fairy Ball) until its night is over, even when Kohsi does not list it.
// Nothing at all to show: the card is simply not there. A tap opens the gathering's page, or the
// What's on sheet.

type Gathering = {
  id: string;
  title: string;
  kind: string | null;
  place: string | null;
  startsAt: string;
  timezone: string;
  // Kohsi record 0148: the collective at somebody else's event; link is the organiser's page.
  appearance?: boolean;
  link?: string | null;
};

const SHOWN = 2;
const noSubscribe = () => () => {};

// One line on the card, from Kohsi or from the site itself.
type SoonItem = { id: string; title: string; month: string; day: string; weekday: string; meta: string; href: string | null; away?: boolean };

function fromKohsi(g: Gathering): SoonItem {
  const p = parts(g);
  // An appearance opens the organiser's own page, in a new tab: their event, their tickets.
  const away = g.appearance === true && typeof g.link === "string" && g.link.startsWith("https://");
  return { id: g.id, title: g.title, month: p.month, day: p.day, weekday: p.weekday, meta: [away ? "Find us there" : p.weekday, p.time, g.place].filter(Boolean).join(" · "), href: away ? (g.link as string) : eventPageFor(g.title), away };
}

// The site's own gathering still to come (the Fairy Ball, while FAIRY_BALL.showUntil is ahead),
// unless Kohsi already lists it.
function pinned(listed: Gathering[]): SoonItem[] {
  const href = EVENT_PAGES.find((page) => page.slug === FAIRY_BALL.slug)?.href ?? null;
  if (listed.some((g) => eventPageFor(g.title) === href)) return [];
  const d = FAIRY_BALL.shortDate;
  return [{ id: FAIRY_BALL.slug, title: FAIRY_BALL.title, month: d.month, day: d.day, weekday: d.weekday, meta: `${d.weekday} · Tickets and waiver`, href }];
}

// Where the sparkles sit around the card (x, y as % of the card), their size and their beat.
const SPARKLES = [
  { "--x": "6%", "--y": "-10%", "--s": "12px", "--d": "0s" },
  { "--x": "93%", "--y": "-8%", "--s": "16px", "--d": "1.1s" },
  { "--x": "101%", "--y": "46%", "--s": "10px", "--d": "2.3s" },
  { "--x": "78%", "--y": "104%", "--s": "13px", "--d": "0.6s" },
  { "--x": "-2%", "--y": "70%", "--s": "11px", "--d": "1.7s" },
  { "--x": "38%", "--y": "-6%", "--s": "8px", "--d": "2.9s" },
  { "--x": "60%", "--y": "18%", "--s": "7px", "--d": "3.6s" },
  { "--x": "24%", "--y": "96%", "--s": "9px", "--d": "2s" },
];

function parts(g: Gathering) {
  const when = new Date(g.startsAt);
  const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: g.timezone, ...options }).format(when);
  return {
    month: fmt({ month: "short" }),
    day: fmt({ day: "numeric" }),
    weekday: fmt({ weekday: "short" }),
    time: fmt({ hour: "numeric", minute: "2-digit" }).replace(":00", ""),
  };
}

function useSoon(): Gathering[] {
  const [list, setList] = useState<Gathering[]>([]);
  useEffect(() => {
    if (!KOHSI_KEY) return;
    const abort = new AbortController();
    fetch(`${KOHSI_URL}/v1/gatherings?limit=${SHOWN + 1}`, { headers: { authorization: `Bearer ${KOHSI_KEY}` }, signal: abort.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (Array.isArray(body?.data)) setList(body.data);
      })
      .catch(() => {
        /* Kohsi out of reach: no card */
      });
    return () => abort.abort();
  }, []);
  return list;
}

export function HappeningSoon({ onOpen }: { onOpen: () => void }) {
  const listed = useSoon();
  // Whether the ball is still ahead: false in the exported HTML and on hydration, read from the
  // visitor's clock after, so the pinned line never goes stale.
  const ballAhead = useSyncExternalStore(noSubscribe, () => Date.now() < Date.parse(FAIRY_BALL.showUntil), () => false);
  const list = [...(ballAhead ? pinned(listed) : []), ...listed.map(fromKohsi)];
  const shown = list.slice(0, SHOWN);
  const more = list.length > SHOWN;
  // A gathering with its own page here opens it; any other opens the calendar.
  const open = (item: SoonItem) => {
    if (item.away && item.href) window.open(item.href, "_blank", "noopener,noreferrer");
    else if (item.href) window.location.assign(item.href);
    else onOpen();
  };

  return (
    <AnimatePresence>
      {shown.length > 0 && (
        <motion.aside
          className="soon"
          aria-label="Happening soon"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.3, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <span className="soon-sparkles" aria-hidden="true">
            {SPARKLES.map((spark, index) => (
              <i key={index} style={spark as CSSProperties} />
            ))}
          </span>
          <p className="soon-kicker">
            <span className="soon-glow" aria-hidden="true" />
            Happening soon
          </p>
          <ul className="soon-list">
            {shown.map((item) => (
              <li key={item.id}>
                <button type="button" className="soon-item" onClick={() => open(item)}>
                  <span className="soon-date" aria-hidden="true">
                    <span className="soon-month">{item.month}</span>
                    <span className="soon-day">{item.day}</span>
                  </span>
                  <span className="soon-text">
                    <span className="soon-title">{item.title}</span>
                    <span className="soon-meta">
                      <span className="sr-only">{`${item.month} ${item.day}, `}</span>
                      {item.meta}
                    </span>
                  </span>
                  <ArrowUpRight className="soon-arrow" size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {more && (
            <button type="button" className="soon-more" onClick={onOpen}>
              See everything on the calendar
            </button>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
