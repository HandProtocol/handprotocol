"use client";

/*
  Inbox quick-capture form. Sits at the top of /inbox.
  Three fields, all optional individually but at least one is required:
  a URL, a short title, and a free-form notes body. Source is fixed to
  "manual" for the in-app capture; the API route sets the other sources.

  On save, the form pulses (motion vocabulary) and clears.
*/

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { captureInboxItem } from "@/lib/inbox/actions";
import { pulse } from "@/lib/motion/anime";

export function CaptureForm() {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const panelRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("url", url);
    fd.set("title", title);
    fd.set("body", body);
    fd.set("source", "manual");

    startTransition(async () => {
      try {
        await captureInboxItem(fd);
        toast.success("Captured");
        setUrl("");
        setTitle("");
        setBody("");
        if (panelRef.current) pulse(panelRef.current);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  return (
    <form
      ref={panelRef}
      onSubmit={handleSubmit}
      className="panel p-4 space-y-3"
      aria-label="Quick capture"
    >
      <div className="flex items-center justify-between">
        <p className="eyebrow">
          QUICK · CAPTURE · H<span className="amber">4</span>
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
          source manual
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
        <div className="space-y-1">
          <label className="hud-label" htmlFor="inbox-url">
            URL
          </label>
          <input
            id="inbox-url"
            name="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://funder.org/program"
            className="hud-input"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1">
          <label className="hud-label" htmlFor="inbox-title">
            TITLE · OPTIONAL
          </label>
          <input
            id="inbox-title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short label, e.g. Trinity Builders RFP"
            className="hud-input"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="hud-label" htmlFor="inbox-body">
          NOTES · PASTE
        </label>
        <textarea
          id="inbox-body"
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Paste an RFP excerpt, a screenshot caption, or notes about why this funder caught your eye."
          className="hud-input hud-textarea"
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-[var(--ink-dim)]">
          Save anything worth a second look. Triage later.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--amber)] px-3 py-1.5 text-sm font-medium text-[#1a1206] hover:bg-[var(--amber-soft)] transition-colors disabled:opacity-50"
        >
          {pending ? "Saving" : "Capture"}
        </button>
      </div>
    </form>
  );
}
