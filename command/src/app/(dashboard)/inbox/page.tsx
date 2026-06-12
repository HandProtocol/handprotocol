import { CaptureForm } from "@/components/inbox/capture-form";
import { InboxList } from "@/components/inbox/inbox-list";
import { listInboxItems, getInboxCounts } from "@/lib/inbox/queries";
import { INBOX_STATUSES, type InboxStatus } from "@/lib/inbox/types";

/*
  Inbox page. Quick-capture form on top, filter chips + list below.
  Default filter is needs_triage; the operator only sees what still
  needs a decision. PRD section 7.1 H4. Phase 2.
*/

export const dynamic = "force-dynamic";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const requested = params.status as InboxStatus | undefined;
  const activeStatus: InboxStatus =
    requested && (INBOX_STATUSES as readonly string[]).includes(requested)
      ? requested
      : "needs_triage";

  const [items, counts] = await Promise.all([
    listInboxItems({ status: activeStatus, limit: 100 }),
    getInboxCounts(),
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="eyebrow">
          HOLISTIC · INBOX · H<span className="amber">4</span>
        </p>
        <h1 className="text-2xl font-medium tracking-tight">Quick capture</h1>
        <p className="text-sm text-[var(--ink-dim)] max-w-prose">
          Paste a funder URL, an RFP excerpt, or a quick note. Triage
          later into a grant, a funder, or discard with a reason. The
          browser extension and an email-forward address land here too.
        </p>
      </header>

      <CaptureForm />

      <InboxList items={items} counts={counts} activeStatus={activeStatus} />

      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">
        {counts.needs_triage} waiting · {counts.becomes_grant} promoted to
        grant · {counts.becomes_funder} promoted to funder · {counts.discarded}{" "}
        discarded
      </p>
    </div>
  );
}
