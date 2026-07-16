"use client";

import { useActionState } from "react";
import { CheckCircle2, Copy, RadioTower, Webhook } from "lucide-react";
import {
  createInboundWebhookAction,
  enableReceivingAction,
  type ResendActionState,
} from "@/lib/resend/actions";

const INITIAL_STATE: ResendActionState = {
  ok: false,
  message: "",
};

function CopySecretButton({ value }: { value: string }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(value)}
      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[rgba(245,239,225,0.1)] px-2 py-1 text-xs text-[var(--ink-dim)] transition-colors hover:border-[rgba(217,119,6,0.45)] hover:text-[var(--amber-soft)] sm:w-auto"
    >
      <Copy className="h-3 w-3" aria-hidden />
      Copy secret
    </button>
  );
}

export function ResendActionPanel() {
  const [receivingState, enableReceiving, receivingPending] = useActionState(
    enableReceivingAction,
    INITIAL_STATE,
  );
  const [webhookState, createWebhook, webhookPending] = useActionState(
    createInboundWebhookAction,
    INITIAL_STATE,
  );

  return (
    <section aria-labelledby="actions-heading" className="panel p-5 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="actions-heading" className="display-eyebrow">
            OPERATIONS
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            These actions require a full-access Resend key in the Command Center
            environment. They do not expose the key to the browser.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <form action={enableReceiving} className="rounded-md border border-[rgba(245,239,225,0.07)] p-4">
          <div className="flex items-center gap-2 text-sm text-[var(--ink)]">
            <RadioTower className="h-4 w-4 text-[var(--amber-soft)]" aria-hidden />
            Enable receiving
          </div>
          <p className="mt-2 min-h-12 text-xs leading-5 text-[var(--ink-dim)]">
            Turns on inbound mail capability for handprotocol.org inside Resend.
            DNS still needs the receiving MX record shown by Resend.
          </p>
          <button
            type="submit"
            disabled={receivingPending}
            className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-[var(--amber)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#b45309] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {receivingPending ? "Enabling..." : "Enable receiving"}
          </button>
          {receivingState.message ? (
            <p
              className={`mt-3 text-xs leading-5 ${
                receivingState.ok ? "text-[var(--amber-soft)]" : "text-[#fca5a5]"
              }`}
            >
              {receivingState.message}
            </p>
          ) : null}
        </form>

        <form action={createWebhook} className="rounded-md border border-[rgba(245,239,225,0.07)] p-4">
          <div className="flex items-center gap-2 text-sm text-[var(--ink)]">
            <Webhook className="h-4 w-4 text-[var(--amber-soft)]" aria-hidden />
            Create inbound webhook
          </div>
          <p className="mt-2 min-h-12 text-xs leading-5 text-[var(--ink-dim)]">
            Registers the Netlify forwarding endpoint for email.received events.
            Save the signing secret immediately.
          </p>
          <button
            type="submit"
            disabled={webhookPending}
            className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-[var(--amber)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#b45309] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {webhookPending ? "Creating..." : "Create webhook"}
          </button>
          {webhookState.message ? (
            <p
              className={`mt-3 text-xs leading-5 ${
                webhookState.ok ? "text-[var(--amber-soft)]" : "text-[#fca5a5]"
              }`}
            >
              {webhookState.ok ? (
                <CheckCircle2 className="mr-1 inline h-3 w-3" aria-hidden />
              ) : null}
              {webhookState.message}
            </p>
          ) : null}
          {webhookState.signingSecret ? (
            <div className="mt-3 space-y-2 rounded-md border border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.08)] p-3">
              <p className="display-eyebrow text-[var(--amber-soft)]">
                Signing secret
              </p>
              <code className="block break-all text-xs text-[var(--ink)]">
                {webhookState.signingSecret}
              </code>
              <CopySecretButton value={webhookState.signingSecret} />
            </div>
          ) : null}
        </form>
      </div>
    </section>
  );
}
