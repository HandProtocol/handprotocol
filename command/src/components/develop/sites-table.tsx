import Link from "next/link";
import { ExternalLink, Eye, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BizLead } from "@/lib/develop/types";

/*
  Registry of live owned sites for the Develop pillar. Each row is a business
  that graduated from a free demo to its own production domain (hand-biz-pitch
  Phase 6). Server component, no client interactivity: a scannable table on wide
  screens, stacked panel cards on narrow. Built to stay legible at 50+ rows.
*/

// SSL state chip, same mono/uppercase HUD register as the status chip. Issued
// reads green, pending amber, none/null dimmed.
const SSL_STYLES: Record<string, string> = {
  issued: "text-[#86efac] border-[rgba(34,197,94,0.45)]",
  pending: "text-[var(--amber-soft)] border-[rgba(217,119,6,0.4)]",
  none: "text-[var(--ink-faint)] border-[rgba(245,239,225,0.1)]",
};

function SslChip({ state }: { state: string | null }) {
  const key = state && state in SSL_STYLES ? state : "none";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]",
        SSL_STYLES[key],
      )}
      title={`SSL ${key}`}
    >
      <ShieldCheck className="h-3 w-3" aria-hidden />
      {key === "none" ? "no ssl" : `ssl ${key}`}
    </span>
  );
}

// Guarded date format: null-safe, short human form ("Jun 4, 2026").
function wentLive(iso: string | null): string {
  if (!iso) return "date unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "date unknown";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function VisitCount({ count }: { count: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-xs text-[var(--ink-dim)]"
      title={`${count} ${count === 1 ? "visit" : "visits"}`}
    >
      <Eye className="h-3.5 w-3.5" aria-hidden />
      {count}
    </span>
  );
}

function DomainLink({ lead }: { lead: BizLead }) {
  const href = lead.production_url ?? `https://${lead.live_domain}/`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 font-mono text-sm text-[var(--amber-soft)] hover:text-[var(--amber)] hover:underline decoration-[var(--amber-soft)] underline-offset-2"
    >
      {lead.live_domain}
      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
    </a>
  );
}

function SecondaryLinks({ lead }: { lead: BizLead }) {
  return (
    <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
      {lead.demo_url && (
        <a
          href={lead.demo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[var(--ink-dim)]"
        >
          demo
        </a>
      )}
      <Link
        href={`/projects/${lead.slug}`}
        className="hover:text-[var(--ink-dim)]"
      >
        lead
      </Link>
    </span>
  );
}

export function SitesTable({
  sites,
  visitCounts,
}: {
  sites: BizLead[];
  visitCounts: Record<string, number>;
}) {
  return (
    <>
      {/* Wide screens: scannable table. */}
      <div className="panel hidden overflow-x-auto p-0 lg:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[rgba(245,239,225,0.07)] text-left">
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                Business
              </th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                Live domain
              </th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                SSL
              </th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                Went live
              </th>
              <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                Visits
              </th>
              <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                Links
              </th>
            </tr>
          </thead>
          <tbody>
            {sites.map((lead) => (
              <tr
                key={lead.slug}
                className="border-b border-[rgba(245,239,225,0.05)] last:border-0 transition-colors hover:bg-[rgba(217,119,6,0.04)]"
              >
                <td className="px-4 py-3 align-top">
                  <Link
                    href={`/projects/${lead.slug}`}
                    className="font-medium text-[var(--ink)] hover:text-[var(--amber-soft)]"
                  >
                    {lead.name}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--ink-dim)]">
                    <span>
                      {[lead.category, lead.city, lead.state]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {lead.campaign && (
                      <span
                        className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]"
                        style={
                          lead.campaign.color
                            ? { color: lead.campaign.color }
                            : undefined
                        }
                      >
                        {lead.campaign.name}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <DomainLink lead={lead} />
                </td>
                <td className="px-4 py-3 align-top">
                  <SslChip state={lead.ssl_state} />
                </td>
                <td className="px-4 py-3 align-top text-[var(--ink-dim)]">
                  {wentLive(lead.live_at)}
                </td>
                <td className="px-4 py-3 align-top text-right">
                  <VisitCount count={visitCounts[lead.slug] ?? 0} />
                </td>
                <td className="px-4 py-3 align-top text-right">
                  <SecondaryLinks lead={lead} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Narrow screens: stacked panel cards. */}
      <ul className="space-y-3 lg:hidden">
        {sites.map((lead) => (
          <li key={lead.slug} className="panel p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <Link
                  href={`/projects/${lead.slug}`}
                  className="font-medium text-[var(--ink)] hover:text-[var(--amber-soft)]"
                >
                  {lead.name}
                </Link>
                <p className="text-xs text-[var(--ink-dim)]">
                  {[lead.category, lead.city, lead.state]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <SslChip state={lead.ssl_state} />
            </div>

            <DomainLink lead={lead} />

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--ink-dim)]">
              <span>
                <span className="text-[var(--ink-faint)]">Went live </span>
                {wentLive(lead.live_at)}
              </span>
              <VisitCount count={visitCounts[lead.slug] ?? 0} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {lead.campaign ? (
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]"
                  style={
                    lead.campaign.color
                      ? { color: lead.campaign.color }
                      : undefined
                  }
                >
                  {lead.campaign.name}
                </span>
              ) : (
                <span aria-hidden />
              )}
              <SecondaryLinks lead={lead} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
