import { createElement, type ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, Mail, ShieldCheck } from "lucide-react";
import { ResendActionPanel } from "@/components/resend/resend-action-panel";

export const dynamic = "force-dynamic";

const FORWARD_TO = process.env.RESEND_FORWARD_TO || "handprotocol@gmail.com";
const FORWARD_FROM = process.env.RESEND_FORWARD_FROM || "HAND Protocol sender";
const WEBHOOK_URL = "https://handprotocol.org/.netlify/functions/resend-inbound-forward";

function StatusRow({ label, detail, ready }: { label: string; detail: string; ready: boolean }) {
  return createElement(
    "div",
    { className: "flex items-start justify-between gap-4 py-3" },
    createElement(
      "div",
      { className: "flex items-start gap-3" },
      createElement("span", {
        "aria-hidden": true,
        className: ready
          ? "mt-1 h-2 w-2 rounded-full bg-[var(--amber)] shadow-[0_0_8px_var(--amber-glow)]"
          : "mt-1 h-2 w-2 rounded-full border border-[rgba(245,239,225,0.25)]",
      }),
      createElement(
        "div",
        null,
        createElement("p", { className: "text-sm text-[var(--ink)]" }, label),
        createElement("p", { className: "mt-1 text-xs text-[var(--ink-dim)]" }, detail),
      ),
    ),
    createElement(
      "span",
      {
        className: ready
          ? "font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--amber-soft)]"
          : "font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]",
      },
      ready ? "SET" : "NEEDED",
    ),
  );
}

function CodeBlock({ children }: { children: ReactNode }) {
  return createElement(
    "code",
    { className: "block rounded-md border border-[rgba(245,239,225,0.08)] bg-[rgba(7,9,15,0.72)] px-3 py-2 font-mono text-xs text-[var(--ink-dim)]" },
    children,
  );
}

export default function ResendPage() {
  const hasApiKey = Boolean(process.env.RESEND_API_KEY);
  const hasWebhookSecret = Boolean(process.env.RESEND_WEBHOOK_SECRET);
  const hasForwardTo = Boolean(process.env.RESEND_FORWARD_TO);
  const hasForwardFrom = Boolean(process.env.RESEND_FORWARD_FROM);
  const receivingReady = hasApiKey && hasWebhookSecret;

  return createElement(
    "div",
    { className: "max-w-5xl space-y-6" },
    createElement(
      "header",
      { className: "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between" },
      createElement(
        "div",
        { className: "space-y-2" },
        createElement("p", { className: "eyebrow" }, "ADMIN · RESEND"),
        createElement(
          "h1",
          { className: "text-2xl font-medium tracking-tight" },
          createElement(Mail, { className: "mr-2 -mt-1 inline-block h-5 w-5", "aria-hidden": true }),
          "Resend control center",
        ),
        createElement(
          "p",
          { className: "max-w-2xl text-sm text-[var(--ink-dim)]" },
          "Inbound mail for handprotocol.org forwards to the shared Gmail inbox. This page tracks the webhook, forwarding map, and setup steps for the public Netlify function.",
        ),
      ),
      createElement(
        "a",
        {
          href: "https://resend.com/domains",
          target: "_blank",
          rel: "noreferrer",
          className: "inline-flex items-center gap-2 rounded-md border border-[rgba(245,239,225,0.12)] px-3 py-2 text-xs text-[var(--ink-dim)] transition-colors hover:border-[rgba(217,119,6,0.35)] hover:text-[var(--ink)]",
        },
        "Resend dashboard",
        createElement(ExternalLink, { className: "h-3.5 w-3.5", "aria-hidden": true }),
      ),
    ),
    createElement(
      "section",
      { className: "grid gap-4 md:grid-cols-3", "aria-label": "Resend summary" },
      createElement(
        "div",
        { className: "panel p-5" },
        createElement("p", { className: "display-eyebrow" }, "INBOUND DOMAIN"),
        createElement("p", { className: "display-stat mt-2 text-xl" }, "handprotocol.org"),
        createElement("p", { className: "mt-2 text-xs text-[var(--ink-dim)]" }, "Wildcard handling is implemented in the Netlify function."),
      ),
      createElement(
        "div",
        { className: "panel p-5" },
        createElement("p", { className: "display-eyebrow" }, "FORWARD TO"),
        createElement("p", { className: "display-stat mt-2 break-all text-xl" }, FORWARD_TO),
        createElement("p", { className: "mt-2 text-xs text-[var(--ink-dim)]" }, "Final destination for forwarded original messages."),
      ),
      createElement(
        "div",
        { className: "panel p-5" },
        createElement("p", { className: "display-eyebrow" }, "WEBHOOK"),
        createElement("p", { className: "display-stat mt-2 text-xl" }, receivingReady ? "ready" : "pending"),
        createElement("p", { className: "mt-2 text-xs text-[var(--ink-dim)]" }, "Requires receiving access and the Svix signing secret."),
      ),
    ),
    createElement(
      "section",
      { className: "grid gap-4 lg:grid-cols-[1.15fr_0.85fr]" },
      createElement(
        "div",
        { className: "panel p-5 space-y-4" },
        createElement(
          "div",
          { className: "flex items-center gap-2" },
          createElement(ShieldCheck, { className: "h-4 w-4 text-[var(--amber-soft)]", "aria-hidden": true }),
          createElement("h2", { className: "display-eyebrow" }, "FORWARDING MAP"),
        ),
        createElement(
          "div",
          { className: "space-y-3 text-sm" },
          createElement("p", { className: "text-[var(--ink)]" }, "Any local part at handprotocol.org"),
          createElement("p", { className: "text-xs text-[var(--ink-dim)]" }, "Includes reachout@handprotocol.org, hand@handprotocol.org, and future aliases."),
          createElement(CodeBlock, null, "*@handprotocol.org forwards to ", FORWARD_TO),
          createElement(CodeBlock, null, "Forward from: ", FORWARD_FROM),
          createElement(CodeBlock, null, "Webhook: ", WEBHOOK_URL),
        ),
      ),
      createElement(
        "div",
        { className: "panel p-5 space-y-1" },
        createElement("h2", { className: "display-eyebrow pb-1" }, "ENV · READINESS"),
        createElement(
          "div",
          { className: "divide-y divide-[rgba(245,239,225,0.06)]" },
          createElement(StatusRow, { label: "RESEND_API_KEY", detail: "Needed for receiving lookup and forwarding send.", ready: hasApiKey }),
          createElement(StatusRow, { label: "RESEND_WEBHOOK_SECRET", detail: "Needed to verify Resend Svix webhook signatures.", ready: hasWebhookSecret }),
          createElement(StatusRow, { label: "RESEND_FORWARD_TO", detail: "Defaults to handprotocol@gmail.com when unset.", ready: hasForwardTo }),
          createElement(StatusRow, { label: "RESEND_FORWARD_FROM", detail: "Defaults to the HAND Protocol sender when unset.", ready: hasForwardFrom }),
        ),
      ),
    ),
    createElement(ResendActionPanel),
    createElement(
      "section",
      { className: "panel p-5 space-y-4" },
      createElement("h2", { className: "display-eyebrow" }, "REMAINING SETUP"),
      createElement(
        "ol",
        { className: "space-y-3 text-sm text-[var(--ink-dim)]" },
        createElement("li", null, "1. Use a full-access Resend key to enable receiving for handprotocol.org."),
        createElement("li", null, "2. Create an email.received webhook pointed at the Netlify function endpoint."),
        createElement("li", null, "3. Save the webhook signing secret as RESEND_WEBHOOK_SECRET on the public handprotocol Netlify site."),
        createElement("li", null, "4. Add the Resend receiving MX record in Netlify DNS, then redeploy and smoke test reachout@handprotocol.org and hand@handprotocol.org."),
      ),
      createElement(
        "div",
        { className: "flex flex-wrap gap-3 border-t border-[rgba(245,239,225,0.06)] pt-3" },
        createElement(Link, { href: "/settings", className: "inline-flex items-center gap-1.5 text-xs text-[var(--ink-dim)] hover:text-[var(--amber-soft)]" }, "Settings"),
        createElement(
          "a",
          {
            href: "https://app.netlify.com/sites/handprotocol/configuration/env",
            target: "_blank",
            rel: "noreferrer",
            className: "inline-flex items-center gap-1.5 text-xs text-[var(--ink-dim)] hover:text-[var(--amber-soft)]",
          },
          "Netlify env",
          createElement(ExternalLink, { className: "h-3 w-3", "aria-hidden": true }),
        ),
      ),
    ),
  );
}
