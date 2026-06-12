import Link from "next/link";

import { ApplyForm } from "./apply-form";

/*
  Public "Apply for Command Center" page at /apply (in the proxy publicPaths
  allowlist — no auth). A lightweight, anonymous-friendly request form. The
  submitApplication action it posts to is hardened server-side; this shell just
  frames it in the same HUD register as the login / invite-redemption pages.
*/

export const metadata = {
  title: "Apply · HAND Command Center",
  description: "Request access to the HAND Command Center.",
};

export default function ApplyPage() {
  return (
    <div className="hud-surface relative min-h-screen flex items-center justify-center px-4 py-12">
      <div className="hud-bracket hud-bracket-tl" />
      <div className="hud-bracket hud-bracket-tr" />
      <div className="hud-bracket hud-bracket-bl" />
      <div className="hud-bracket hud-bracket-br" />

      <div className="relative w-full max-w-md space-y-6">
        <header className="text-center space-y-3">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[rgba(217,119,6,0.35)] bg-[rgba(217,119,6,0.12)]">
            <span className="font-mono text-base font-semibold text-[var(--amber-soft)]">
              H
            </span>
          </div>
          <div>
            <h1 className="text-xl font-medium tracking-tight">
              Apply for the Command Center
            </h1>
            <p className="mt-1 eyebrow">Request operator access</p>
          </div>
          <p className="mx-auto max-w-sm text-sm text-[var(--ink-dim)]">
            Tell us who you are and the access you&apos;d like. An admin reviews
            every request; approved applicants get a one-time invite link.
          </p>
        </header>

        <ApplyForm />

        <p className="text-center text-xs text-[var(--ink-dim)]">
          Already have access?{" "}
          <Link
            href="/auth/login"
            className="text-[var(--amber-soft)] hover:underline"
          >
            Sign in
          </Link>
        </p>

        <p className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">
          HAND Protocol, 501(c)(3) in formation, Austin, TX
        </p>
      </div>
    </div>
  );
}
