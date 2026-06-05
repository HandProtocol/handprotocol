"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Send, CheckCircle2 } from "lucide-react";

import { submitApplication } from "@/lib/applications/actions";
import {
  SELF_SERVICE_ROLE_OPTIONS,
  type SelfServiceRole,
  type SubmitFieldError,
} from "@/lib/applications/types";

/*
  Public "Apply for Command Center" form (client). Posts directly to the
  submitApplication server action — no auth, anonymous-friendly. The action is
  hardened server-side (honeypot, length caps, role clamp), so this component
  stays light: it collects, shows a confirmation on success, and surfaces the
  typed field errors the action returns. Styled to match the login / HUD shell.
*/

const field =
  "w-full rounded-md border border-[rgba(245,239,225,0.12)] bg-[rgba(7,9,15,0.6)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[rgba(217,119,6,0.4)] focus:outline-none";
const label =
  "block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)] mb-1.5";

const FIELD_MESSAGES: Record<SubmitFieldError, string> = {
  email: "Enter a valid email address.",
  name: "Tell us your name.",
  desired_role: "Pick the access you'd like.",
  message: "",
};

export function ApplyForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [desiredRole, setDesiredRole] =
    useState<SelfServiceRole>("contributor");
  const [message, setMessage] = useState("");
  // Honeypot — hidden from humans, left empty. Bots that fill it get a silent
  // success server-side.
  const [companyWebsite, setCompanyWebsite] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<SubmitFieldError[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);
    setFormError(null);
    try {
      const res = await submitApplication({
        name,
        email,
        organization,
        desired_role: desiredRole,
        message,
        company_website: companyWebsite,
        source:
          typeof window !== "undefined" ? window.location.pathname : "/apply",
      });
      if (res.ok) {
        setDone(true);
      } else if (res.fields.length > 0) {
        setErrors(res.fields);
      } else {
        setFormError(
          "Something went wrong sending your request. Please try again in a moment.",
        );
      }
    } catch {
      setFormError(
        "We couldn't reach the server. Please check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="panel p-6 space-y-4">
        <div className="flex items-start gap-3">
          <CheckCircle2
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#86efac]"
            aria-hidden
          />
          <div className="space-y-1">
            <p className="text-base text-[var(--ink)]">Request received</p>
            <p className="text-sm text-[var(--ink-dim)]">
              Thanks — the team will review your request. If it&apos;s a fit,
              you&apos;ll get an invite link to set up access. No account is
              created until you accept it.
            </p>
          </div>
        </div>
        <div className="border-t border-[rgba(245,239,225,0.06)] pt-4">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-dim)] hover:text-[var(--amber-soft)]"
          >
            Back to sign-in
          </Link>
        </div>
      </div>
    );
  }

  const hasError = (f: SubmitFieldError) => errors.includes(f);

  return (
    <div className="panel p-6 space-y-5">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label className={label} htmlFor="apply-name">
            Name *
          </label>
          <input
            id="apply-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            required
            className={field}
            placeholder="Your name"
            aria-invalid={hasError("name")}
          />
          {hasError("name") ? (
            <p className="mt-1 text-xs text-[#f87171]">{FIELD_MESSAGES.name}</p>
          ) : null}
        </div>

        <div>
          <label className={label} htmlFor="apply-email">
            Email *
          </label>
          <input
            id="apply-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
            required
            className={field}
            placeholder="you@example.org"
            aria-invalid={hasError("email")}
          />
          {hasError("email") ? (
            <p className="mt-1 text-xs text-[#f87171]">{FIELD_MESSAGES.email}</p>
          ) : null}
        </div>

        <div>
          <label className={label} htmlFor="apply-org">
            Organization (optional)
          </label>
          <input
            id="apply-org"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            maxLength={160}
            className={field}
            placeholder="Where you work, if relevant"
          />
        </div>

        <div>
          <label className={label} htmlFor="apply-role">
            Access you&apos;d like *
          </label>
          <select
            id="apply-role"
            value={desiredRole}
            onChange={(e) => setDesiredRole(e.target.value as SelfServiceRole)}
            className={field}
            aria-invalid={hasError("desired_role")}
          >
            {SELF_SERVICE_ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {hasError("desired_role") ? (
            <p className="mt-1 text-xs text-[#f87171]">
              {FIELD_MESSAGES.desired_role}
            </p>
          ) : null}
          <p className="mt-1.5 text-xs text-[var(--ink-dim)]">
            An admin makes the final call and may adjust this at approval.
          </p>
        </div>

        <div>
          <label className={label} htmlFor="apply-message">
            Anything else (optional)
          </label>
          <textarea
            id="apply-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            rows={4}
            className={field}
            placeholder="How you'd use the Command Center, who referred you, etc."
          />
        </div>

        {/* Honeypot — visually hidden, off the tab order, ignored by humans. */}
        <div aria-hidden className="hidden">
          <label htmlFor="company-website">Company website</label>
          <input
            id="company-website"
            name="company_website"
            tabIndex={-1}
            autoComplete="off"
            value={companyWebsite}
            onChange={(e) => setCompanyWebsite(e.target.value)}
          />
        </div>

        {formError ? (
          <p className="text-xs text-[#f87171]">{formError}</p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--amber)] px-4 py-2.5 text-sm font-medium text-[#1a1208] transition-all hover:bg-[var(--amber-soft)] hover:shadow-[0_0_14px_var(--amber-glow)] disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
          {submitting ? "Sending" : "Request access"}
        </button>
      </form>
    </div>
  );
}
