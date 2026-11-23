"use client";

import { useState, type FormEvent } from "react";
import { Mark, MoonBand, type Glyph } from "./almanac/ornaments";
import { WHATS_ON } from "./copy";
import { KOHSI_KEY, KOHSI_URL, KohsiBooking } from "./kohsi-booking";
import { KohsiCalendar } from "./kohsi-calendar";
import { FocusTitle, Leaf } from "./sheet";

// Three doors, two tabs: "whatson" and "visit" are the two ways through the What's on tab
// (Kohsi's breathing calendar, or a visit of your own), "hello" is its own tab. A visit day
// chosen on the calendar opens the visit way on that day.
export type Door = "hello" | "whatson" | "visit";
type Tab = "whatson" | "hello";

const WAYS: { key: Door; label: string; hint: string; mark: Glyph }[] = [
  { key: "whatson", label: WHATS_ON.ways.calendar.label, hint: WHATS_ON.ways.calendar.hint, mark: "mk-moon" },
  { key: "visit", label: WHATS_ON.ways.visit.label, hint: WHATS_ON.ways.visit.hint, mark: "mk-compass" },
];

// The two ways onto the land, ruled like an almanac's table of contents.
function Ways({ current, onPick }: { current: Door; onPick: (door: Door) => void }) {
  return (
    <div className="al-ways" role="tablist" aria-label="Two ways onto the land">
      {WAYS.map((way) => (
        <button key={way.key} role="tab" aria-selected={current === way.key} className="al-way" type="button" onClick={() => onPick(way.key)}>
          <Mark id={way.mark} className="al-way-mark" />
          <span className="al-way-words">
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

type HelloState = "idle" | "sending" | "sent" | "failed" | "capped" | "invalid";

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

// What Kohsi made of the note. "sent": kept in the collective's Messages and mailed to its Team.
// "refused": Kohsi answered and said no on purpose (the daily cap, a field it would not take);
// the visitor is told why, and the note is NOT sent anywhere else, because a detour would land
// it with HAND instead of the collective while the visitor reads "Received". "unreachable": no
// key, no answer, a 5xx, or the key itself refused (401/403, our fault, not the visitor's): only
// then does it go to HAND's feedback function, which pins it and pages a person to pass it on.
type NoteResult = { kind: "sent" } | { kind: "refused"; code: string; message: string } | { kind: "unreachable" };

const newKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function sendToCollective(name: string, email: string, message: string): Promise<NoteResult> {
  if (!KOHSI_KEY) return { kind: "unreachable" };
  try {
    const res = await fetch(`${KOHSI_URL}/v1/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KOHSI_KEY}`, "Idempotency-Key": newKey() },
      body: JSON.stringify({ name, email, message, lang: "en" }),
    });
    if (res.ok) return { kind: "sent" };
    if (res.status === 429 || res.status === 400) {
      const body = await res.json().catch(() => null);
      return { kind: "refused", code: body?.error?.code ?? String(res.status), message: body?.error?.details?.[0]?.message ?? body?.error?.message ?? "" };
    }
    console.warn("[say hello] Kohsi did not take the note", res.status);
    return { kind: "unreachable" };
  } catch (error) {
    console.warn("[say hello] Kohsi unreachable", error);
    return { kind: "unreachable" };
  }
}

// HAND's feedback function, for an outage only (see NoteResult).
async function sendToHand(name: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(HELLO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, name, path: window.location.pathname, title: document.title, source: "mystichearts", website: "" }),
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
  const [refusal, setRefusal] = useState("");
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
    const result = await sendToCollective(name, email, note);
    if (result.kind === "refused") {
      setRefusal(result.message);
      setState(result.code === "rate_limited" ? "capped" : "invalid");
      return;
    }
    const reached = result.kind === "sent" || (await sendToHand(name, text));
    if (reached && keepPosted) setConfirmSent(await askToJoin(name, email));
    setState(reached ? "sent" : "failed");
  }

  if (state === "sent") {
    return (
      <div className="door-done">
        <h3 className="al-h3">Received, with thanks.</h3>
        <p>A person reads every note. You will hear back from us, not from a machine.</p>
        {confirmSent && <p>One more step for the list: if this email is new to us, a confirm link is on its way. Open it and press the button to join.</p>}
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
        <p className="door-error" role="alert">
          That did not go through. Write to us at <a href={mailto}>{fallbackEmail}</a> instead and we will answer you there.
        </p>
      )}
      {state === "capped" && (
        <p className="door-error" role="alert">
          {/business/i.test(refusal)
            ? "Our note box has reached its limit for today, so this one did not send."
            : "You have reached today's limit for notes from one email, so this one did not send."}{" "}
          Write to us at <a href={mailto}>{fallbackEmail}</a> and we will answer you there.
        </p>
      )}
      {state === "invalid" && (
        <p className="door-error" role="alert">
          {refusal ? `${refusal.charAt(0).toUpperCase()}${refusal.slice(1)}.` : "Something in the form was not accepted."} Check it and send again, or write to us at <a href={mailto}>{fallbackEmail}</a>.
        </p>
      )}
      <div className="door-actions">
        <button className="al-btn al-btn--rubric" type="submit" disabled={state === "sending"}>
          <Mark id="flameheart" />
          {state === "sending" ? "Sending…" : "Send"}
        </button>
        <span className="door-fine">We never share your details.</span>
      </div>
    </form>
  );
}

// The open door's leaf (Say hello, or the calendar and the visit as two ways through one leaf);
// the book around it is AlmanacSheet, which also keeps the day and the note carried between them.
export function DoorLeaf({
  door,
  onSwitch,
  fallbackEmail,
  visitDate,
  setVisitDate,
  helloSeed,
  setHelloSeed,
}: {
  door: Door;
  onSwitch: (door: Door) => void;
  fallbackEmail: string;
  visitDate: string | null;
  setVisitDate: (date: string | null) => void;
  helloSeed: string | undefined;
  setHelloSeed: (seed: string | undefined) => void;
}) {
  const current = door;
  const tab: Tab = current === "hello" ? "hello" : "whatson";
  const pickWay = (next: Door) => {
    setVisitDate(null);
    onSwitch(next);
  };
  return (
    <>
      {tab === "hello" && (
        <Leaf
          id="hello"
          heads={["Mystic Hearts Healing Collective", "Say hello"]}
          folio={["xi", "xii"]}
          verso={
            <>
              <div style={{ order: 1 }}>
                <p className="al-kicker">Come home to the collective</p>
                <FocusTitle>
                  Tell us what you are <em>carrying.</em>
                </FocusTitle>
              </div>
              <p className="al-lede" style={{ order: 2 }}>
                Whether you are interested in visiting, joining our community, attending a gathering, or exploring residency, we would love to hear from you.
              </p>
              <p className="al-colophon al-colophon--ink" style={{ order: 4 }}>
                <Mark id="flameheart" />A person reads every note, and the reply comes from the collective, not from a machine.
              </p>
            </>
          }
          recto={
            <div className="al-form" style={{ order: 3 }}>
              <HelloForm fallbackEmail={fallbackEmail} seed={helloSeed} />
            </div>
          }
        />
      )}
      {tab === "whatson" && (
        <Leaf
          id="whatson"
          heads={["Mystic Hearts Healing Collective", current === "visit" ? "Visit the land" : "The calendar"]}
          folio={["ix", "x"]}
          verso={
            <>
              <div style={{ order: 0 }}>
                <MoonBand />
              </div>
              <div style={{ order: 1 }}>
                <p className="al-kicker">On the land</p>
                <FocusTitle>
                  What is <em>unfolding.</em>
                </FocusTitle>
              </div>
              <p className="al-lede" style={{ order: 2 }}>
                {WHATS_ON.lede}
              </p>
              <div style={{ order: 3 }}>
                <Ways current={current} onPick={pickWay} />
              </div>
            </>
          }
          recto={
            <div className="al-way-panel" key={current} style={{ order: 4 }}>
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
          }
        />
      )}
    </>
  );
}
