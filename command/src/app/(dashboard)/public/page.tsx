import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, Eye } from "lucide-react";
import { listPublicVisits } from "@/lib/public/queries";

export const dynamic = "force-dynamic";

function pageHref(path: string): string {
  return path === "/"
    ? "https://handprotocol.org/"
    : `https://handprotocol.org${path}`;
}

function hostFromRef(referrer: string | null): string {
  if (!referrer) return "Direct";
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return referrer;
  }
}

export default async function PublicPage() {
  const visits = await listPublicVisits(80);
  const byPage = new Map<
    string,
    { label: string; path: string; count: number; last: string }
  >();
  visits.forEach((visit) => {
    const key = visit.page_path;
    const existing = byPage.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }
    byPage.set(key, {
      label: visit.page_label,
      path: visit.page_path,
      count: 1,
      last: visit.created_at,
    });
  });

  const pageRows = Array.from(byPage.values()).sort(
    (a, b) => b.count - a.count,
  );

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="display-eyebrow">
          <span className="amber">Public</span> site activity
        </p>
        <h1 className="text-2xl font-medium tracking-tight">
          Public-site signals
        </h1>
        <p className="max-w-2xl text-sm text-[var(--ink-dim)]">
          Foundation campaign visits, campaign-adjacent page views, and public
          feedback converge here. Notes still triage through{" "}
          <Link
            href="/feedback"
            className="text-[var(--amber-soft)] hover:underline"
          >
            Feedback
          </Link>
          .
        </p>
      </header>

      <section
        className="grid gap-4 lg:grid-cols-3"
        aria-label="Public visit summary"
      >
        <div className="panel p-5">
          <p className="display-eyebrow">Recent visits</p>
          <p className="mt-3 text-3xl font-medium text-[var(--ink)]">
            {visits.length}
          </p>
          <p className="mt-1 text-xs text-[var(--ink-dim)]">
            Last 80 captured rows
          </p>
        </div>
        <div className="panel p-5">
          <p className="display-eyebrow">Pages seen</p>
          <p className="mt-3 text-3xl font-medium text-[var(--ink)]">
            {pageRows.length}
          </p>
          <p className="mt-1 text-xs text-[var(--ink-dim)]">
            High-value public pages
          </p>
        </div>
        <div className="panel p-5">
          <p className="display-eyebrow">Feedback triage</p>
          <Link
            href="/feedback"
            className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--amber-soft)] hover:underline"
          >
            Open feedback
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <p className="mt-3 text-xs text-[var(--ink-dim)]">
            Public feedback writes to{" "}
            <code className="font-mono">feedback_pins</code>.
          </p>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="panel p-5" aria-labelledby="pages-heading">
          <h2 id="pages-heading" className="display-eyebrow">
            Page rollup
          </h2>
          {pageRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--ink-dim)]">
              No public visits captured yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {pageRows.map((page) => (
                <li key={page.path}>
                  <a
                    href={pageHref(page.path)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-md border border-transparent px-2 py-2 transition-colors hover:border-[rgba(217,119,6,0.25)] hover:bg-[rgba(217,119,6,0.04)]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-[var(--ink)]">
                        {page.label}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                        {page.path}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-2 text-sm text-[var(--amber-soft)]">
                      <Eye className="h-3.5 w-3.5" aria-hidden />
                      {page.count}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-5" aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="display-eyebrow">
            Recent signals
          </h2>
          {visits.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--ink-dim)]">
              Nothing has landed yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[rgba(245,239,225,0.06)]">
              {visits.slice(0, 24).map((visit) => (
                <li
                  key={visit.id}
                  className="grid gap-2 py-3 md:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <a
                      href={pageHref(visit.page_path)}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-sm text-[var(--ink)] hover:text-[var(--amber-soft)]"
                    >
                      {visit.page_label}
                    </a>
                    <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                      {visit.page_path} · {hostFromRef(visit.referrer)}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-xs text-[var(--ink-dim)]">
                      {formatDistanceToNow(new Date(visit.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ink-faint)]">
                      {[visit.city, visit.country].filter(Boolean).join(", ") ||
                        "Unknown"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
