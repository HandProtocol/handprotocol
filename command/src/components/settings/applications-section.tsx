import { Inbox } from "lucide-react";

import { listApplications } from "@/lib/applications/queries";
import type { AccessApplication } from "@/lib/applications/types";
import { ApplicationReview } from "./application-review";

/*
  Applications review section for /settings. Server component — lists pending
  access requests with per-row Approve/Reject controls (client), plus a compact
  log of recently approved/rejected ones. The parent page renders this ONLY when
  can(profile,'users.manage'); the approve/reject actions re-check users.manage
  anyway, so there's no extra guard here. Mirrors invites-section.tsx.
*/

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PendingRow({ app }: { app: AccessApplication }) {
  return (
    <li className="space-y-3 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-[var(--ink)]">
              {app.name || "—"}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--amber-soft)]">
              wants {app.desired_role}
            </span>
            {app.reciprocate_group ? (
              <span className="rounded-full border border-[rgba(245,239,225,0.12)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-dim)]">
                {app.reciprocate_group}
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-[var(--ink-dim)]">
            {app.email}
            {app.organization ? ` · ${app.organization}` : ""} ·{" "}
            {fmtDate(app.created_at)}
          </p>
        </div>
      </div>

      {app.message ? (
        <p className="rounded-md border border-[rgba(245,239,225,0.08)] bg-[rgba(7,9,15,0.35)] px-3 py-2 text-xs text-[var(--ink-dim)]">
          {app.message}
        </p>
      ) : null}

      <ApplicationReview app={app} />
    </li>
  );
}

function ReviewedRow({ app }: { app: AccessApplication }) {
  const approved = app.status === "approved";
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2.5">
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-xs text-[var(--ink)]">
          {app.name || "—"}{" "}
          <span className="text-[var(--ink-dim)]">· {app.email}</span>
        </p>
        <p className="truncate text-[11px] text-[var(--ink-faint)]">
          {app.desired_role} · reviewed {fmtDate(app.reviewed_at)}
        </p>
      </div>
      <span
        className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
          approved ? "text-[#86efac]" : "text-[var(--ink-faint)]"
        }`}
      >
        {app.status}
      </span>
    </li>
  );
}

export async function ApplicationsSection() {
  const [pending, approved, rejected] = await Promise.all([
    listApplications("pending"),
    listApplications("approved"),
    listApplications("rejected"),
  ]);

  // Most-recent handful of reviewed rows, newest first (queries already sort).
  const reviewed = [...approved, ...rejected]
    .sort(
      (a, b) =>
        new Date(b.reviewed_at ?? b.created_at).getTime() -
        new Date(a.reviewed_at ?? a.created_at).getTime(),
    )
    .slice(0, 8);

  return (
    <section
      aria-labelledby="applications-heading"
      className="panel p-5 space-y-5"
    >
      <div className="space-y-1">
        <h2 id="applications-heading" className="display-eyebrow">
          <Inbox className="mr-1.5 -mt-0.5 inline-block h-3.5 w-3.5" aria-hidden />
          APPLICATIONS
        </h2>
        <p className="text-xs text-[var(--ink-dim)]">
          Public access requests from{" "}
          <code className="font-mono text-[11px]">/apply</code>. Approve to issue
          an invite at the chosen role (override the requested one if needed);
          reject to dismiss. No account exists until the applicant redeems.
        </p>
      </div>

      <div className="space-y-2">
        <p className="display-eyebrow">PENDING</p>
        {pending.length === 0 ? (
          <p className="text-xs text-[var(--ink-dim)]">
            No pending requests. New applications from{" "}
            <code className="font-mono text-[11px]">/apply</code> land here.
          </p>
        ) : (
          <ul className="divide-y divide-[rgba(245,239,225,0.06)]">
            {pending.map((app) => (
              <PendingRow key={app.id} app={app} />
            ))}
          </ul>
        )}
      </div>

      {reviewed.length > 0 ? (
        <div className="space-y-2 border-t border-[rgba(245,239,225,0.06)] pt-4">
          <p className="display-eyebrow">RECENTLY REVIEWED</p>
          <ul className="divide-y divide-[rgba(245,239,225,0.06)]">
            {reviewed.map((app) => (
              <ReviewedRow key={app.id} app={app} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
