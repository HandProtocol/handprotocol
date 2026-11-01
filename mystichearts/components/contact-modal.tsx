"use client";

import { ArrowUpRight, CalendarDays, Feather, Footprints, Sparkles } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { KoordiBooking } from "./koordi-booking";
import { KoordiGatherings } from "./koordi-gatherings";
import { FocusTitle, Sheet, SheetPanel, SheetTabs } from "./sheet";

// Three doors, two tabs: "whatson" and "visit" are the two ways through the What's on tab
// (the gatherings board, or a visit of your own), "hello" is its own tab.
export type Door = "hello" | "whatson" | "visit";
type Tab = "whatson" | "hello";

const TABS = [
  { key: "whatson" as const, label: "What's on", icon: <Sparkles size={15} /> },
  { key: "hello" as const, label: "Say hello", icon: <Feather size={15} /> },
];

const WAYS: { key: Door; label: string; hint: string; icon: ReactNode }[] = [
  { key: "whatson", label: "Join a gathering", hint: "Circles, workshops, community days on the board.", icon: <CalendarDays size={18} /> },
  { key: "visit", label: "Come out to the land", hint: "A walk and a conversation, on a day of your own.", icon: <Footprints size={18} /> },
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

const HELLO_ENDPOINT = "/.netlify/functions/feedback";

type HelloState = "idle" | "sending" | "sent" | "failed";

function HelloForm({ fallbackEmail }: { fallbackEmail: string }) {
  const [state, setState] = useState<HelloState>("idle");
  const [draft, setDraft] = useState({ name: "", email: "", note: "", keepPosted: true });

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
      const res = await fetch(`${window.location.origin}${HELLO_ENDPOINT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, name, path: window.location.pathname, title: document.title, source: "mystichearts", website: "" }),
      });
      setState(res.ok ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  }

  if (state === "sent") {
    return (
      <div className="door-done">
        <h3>Received, with thanks.</h3>
        <p>A person reads every note. You will hear back from us, not from a machine.</p>
      </div>
    );
  }

  const mailto = `mailto:${fallbackEmail}?subject=${encodeURIComponent("Hello from the Mystic Hearts site")}&body=${encodeURIComponent(`${draft.note}\n\n${draft.name}\n${draft.email}`)}`;

  return (
    <form className="hello-form" onSubmit={submit}>
      <div className="field-row">
        <label className="field">
          <span>Your name</span>
          <input name="name" type="text" autoComplete="name" required maxLength={120} defaultValue={draft.name} />
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
        <span>Keep me posted on what is unfolding on the land.</span>
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
  fallbackEmail,
}: {
  door: Door | null;
  onClose: () => void;
  onSwitch: (door: Door) => void;
  fallbackEmail: string;
}) {
  const current = door ?? "hello";
  const tab: Tab = current === "hello" ? "hello" : "whatson";
  return (
    <Sheet open={door !== null} label="Get in touch" onClose={onClose} tabs={<SheetTabs items={TABS} current={tab} onPick={onSwitch} label="How to reach us" />}>
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
            <HelloForm fallbackEmail={fallbackEmail} />
          </>
        )}
        {tab === "whatson" && (
          <>
            <p className="modal-kicker">On the land</p>
            <FocusTitle>
              What is <em>unfolding.</em>
            </FocusTitle>
            <p className="modal-lede">
              Two ways in: take a seat at something already on the calendar, or choose a day of your own to walk the land. A person confirms either by hand, and the address comes with the yes.
            </p>
            <Ways current={current} onPick={onSwitch} />
            <div className="way-panel" key={current}>
              {current === "whatson" && <KoordiGatherings onHello={() => onSwitch("hello")} onVisit={() => onSwitch("visit")} />}
              {current === "visit" && <KoordiBooking fallbackEmail={fallbackEmail} />}
            </div>
          </>
        )}
      </SheetPanel>
    </Sheet>
  );
}
