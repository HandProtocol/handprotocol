"use client";

import { ArrowUpRight, CalendarDays, Footprints } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { WHATS_ON, type ChapterKey } from "./copy";
import { KOHSI_KEY, KOHSI_URL, KohsiBooking } from "./kohsi-booking";
import { KohsiCalendar } from "./kohsi-calendar";
import { FocusTitle, Sheet, SheetPanel } from "./sheet";
import { SiteNav } from "./site-nav";

// Three doors, two tabs: "whatson" and "visit" are the two ways through the What's on tab
// (Kohsi's breathing calendar, or a visit of your own), "hello" is its own tab. A visit day
// chosen on the calendar opens the visit way on that day.
export type Door = "hello" | "whatson" | "visit";
type Tab = "whatson" | "hello";

const WAYS: { key: Door; label: string; hint: string; icon: ReactNode }[] = [
  { key: "whatson", label: WHATS_ON.ways.calendar.label, hint: WHATS_ON.ways.calendar.hint, icon: <CalendarDays size={18} /> },
  { key: "visit", label: WHATS_ON.ways.visit.label, hint: WHATS_ON.ways.visit.hint, icon: <Footprints size={18} /> },
];

function Ways({ current, onPick }: { current: Door; onPick: (door: Door) => void }) {
  return (
    <div className="ways" role="tablist" aria-label="Two ways onto the land">
      {WAYS.map((way) => (
        <button key={way.key} role="tab" aria-selected={current === way.key} className="way" type="button" onClick={() => onPick(way.key)}>
          <span className="way-icon">{way.icon}</span>
          <span className="way-words">
            <strong>{way.label}</strong>
            <small>{way.hint}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

// HAND's feedback function. The site lives on its own domain, so production builds name
// handprotocol.org outright (.env.production); a same-origin path is the dev fallback.
const HELLO_URL = process.env.NEXT_PUBLIC_HELLO_URL || "/.netlify/functions/feedback";

type HelloState = "idle" | "sending" | "sent" | "failed";

// The words beside the box, sent with the signup so Kohsi keeps exactly what the person saw.
const KEEP_POSTED = "Keep me posted on what is unfolding on the land.";
const KEEP_POSTED_VERSION = "say-hello-1";

// Keep me posted goes to the collective's own list in Kohsi: it mails a confirm link from the
// collective, and only that link's button puts the address on the list. Best effort: the note
// itself has already gone, so a failure here is not the visitor's to fix.
async function askToJoin(name: string, email: string): Promise<boolean> {
  if (!KOHSI_KEY) return false;
  try {
    const res = await fetch(`${KOHSI_URL}/v1/list/signups`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KOHSI_KEY}`, "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ email, name, lang: "en", wording: { text: KEEP_POSTED, version: KEEP_POSTED_VERSION, checked: true } }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// The note goes to the collective's own admin in Kohsi (Messages), which emails everyone on its
// Team with request emails on, the reply going straight back to the sender. Without a key, or if
// Kohsi does not answer, it goes the old way, to HAND's feedback function, so nothing is lost.
async function sendToCollective(name: string, email: string, message: string): Promise<boolean> {
  if (!KOHSI_KEY) return false;
  try {
    const res = await fetch(`${KOHSI_URL}/v1/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KOHSI_KEY}`, "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ name, email, message, lang: "en" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// `seed` is a first line for the note, when another door sent the visitor here with a reason.
function HelloForm({ fallbackEmail, seed }: { fallbackEmail: string; seed?: string }) {
  const [state, setState] = useState<HelloState>("idle");
  const [confirmSent, setConfirmSent] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", note: seed ?? "", keepPosted: true });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    const form = new FormData(event.currentTarget);
    if (String(form.get("website") || "").trim()) return; // honeypot
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const note = String(form.get("note") || "").trim();
    const keepPosted = form.get("keepPosted") === "on";
    setDraft({ name, email, note, keepPosted });
    setState("sending");
    const text = [`From: ${name} <${email}>`, keepPosted ? "Wants to hear what's unfolding." : "", "", note]
      .filter((line, i) => line !== "" || i === 2)
      .join("\n");
    try {
      const reached = (await sendToCollective(name, email, note)) || (await fetch(HELLO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, name, path: window.location.pathname, title: document.title, source: "mystichearts", website: "" }),
      })).ok;
      if (reached && keepPosted) setConfirmSent(await askToJoin(name, email));
      setState(reached ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  }

  if (state === "sent") {
    return (
      <div className="door-done">
        <h3>Received, with thanks.</h3>
        <p>A person reads every note. You will hear back from us, not from a machine.</p>
        {confirmSent && <p>One more step for the list: we sent you an email. Open it and press the button to confirm.</p>}
      </div>
    );
  }

  const mailto = `mailto:${fallbackEmail}?subject=${encodeURIComponent("Hello from the Mystic Hearts site")}&body=${encodeURIComponent(`${draft.note}\n\n${draft.name}\n${draft.email}`)}`;

  return (
    <form className="hello-form" onSubmit={submit}>
      <div className="field-row">
        <label className="field">
          <span>Your name</span>
          <input name="name" type="text" autoComplete="name" required maxLength={80} defaultValue={draft.name} />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required maxLength={200} defaultValue={draft.email} />
        </label>
      </div>
      <label className="field">
        <span>What brings you here</span>
        <textarea name="note" required minLength={4} maxLength={2000} rows={5} defaultValue={draft.note} placeholder="Visiting, joining the community, attending a gathering, exploring residency, or a question about the land…" />
      </label>
      <label className="tick">
        <input name="keepPosted" type="checkbox" defaultChecked={draft.keepPosted} />
        <span>{KEEP_POSTED}</span>
      </label>
      <input className="hp" name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {state === "failed" && (
        <p className="door-error">
          That did not go through. You can <a href={mailto}>send it by email</a> instead.
        </p>
      )}
      <div className="door-actions">
        <button className="btn btn-gold" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send"}
          <ArrowUpRight size={18} />
        </button>
        <span className="door-fine">We never share your details.</span>
      </div>
    </form>
  );
}

export function ContactModal({
  door,
  onClose,
  onSwitch,
  onChapter,
  fallbackEmail,
}: {
  door: Door | null;
  onClose: () => void;
  onSwitch: (door: Door) => void;
  onChapter: (key: ChapterKey) => void;
  fallbackEmail: string;
}) {
  const current = door ?? "hello";
  const tab: Tab = current === "hello" ? "hello" : "whatson";
  // The day chosen on the calendar, carried into the visit way, and the note Say hello opens
  // with when the calendar's host button sent the visitor; both forgotten when the sheet closes.
  const [visitDate, setVisitDate] = useState<string | null>(null);
  const [helloSeed, setHelloSeed] = useState<string | undefined>(undefined);
  const close = () => {
    setVisitDate(null);
    setHelloSeed(undefined);
    onClose();
  };
  const pickWay = (next: Door) => {
    setVisitDate(null);
    onSwitch(next);
  };
  return (
    <Sheet open={door !== null} label="Get in touch" onClose={close} tabs={<SiteNav chapter={null} door={current} onChapter={onChapter} onDoor={pickWay} />}>
      <SheetPanel id={tab}>
        {tab === "hello" && (
          <>
            <p className="modal-kicker">Come home to the collective</p>
            <FocusTitle>
              Tell us what you are <em>carrying.</em>
            </FocusTitle>
            <p className="modal-lede">
              Whether you are interested in visiting, joining our community, attending a gathering, or exploring residency, we would love to hear from you.
            </p>
            <HelloForm fallbackEmail={fallbackEmail} seed={helloSeed} />
          </>
        )}
        {tab === "whatson" && (
          <>
            <p className="modal-kicker">On the land</p>
            <FocusTitle>
              What is <em>unfolding.</em>
            </FocusTitle>
            <p className="modal-lede">{WHATS_ON.lede}</p>
            <Ways current={current} onPick={pickWay} />
            <div className="way-panel" key={current}>
              {current === "whatson" && (
                <KohsiCalendar
                  onHello={() => onSwitch("hello")}
                  onHost={() => {
                    setHelloSeed(WHATS_ON.hostNote);
                    onSwitch("hello");
                  }}
                  onVisit={(date) => {
                    setVisitDate(date);
                    onSwitch("visit");
                  }}
                />
              )}
              {current === "visit" && (
                <>
                  {visitDate && (
                    <p className="calendar-back">
                      <button type="button" className="link-btn" onClick={() => pickWay("whatson")}>
                        {WHATS_ON.back}
                      </button>
                    </p>
                  )}
                  <KohsiBooking fallbackEmail={fallbackEmail} date={visitDate} />
                </>
              )}
            </div>
          </>
        )}
      </SheetPanel>
    </Sheet>
  );
}
