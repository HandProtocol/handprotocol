import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Star,
  Phone,
  MapPin,
  Globe,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import {
  getBizLeadBySlug,
  listCampaigns,
  listTouchpoints,
  listPitchResponses,
  getVisitStats,
} from "@/lib/develop/queries";
import { isLiveSite } from "@/lib/develop/types";
import { BizStatusChip } from "@/components/develop/status-chip";
import { CampaignPicker } from "@/components/develop/campaign-picker";
import { GeneratePanel } from "@/components/develop/generate-panel";
import { PitchPanel } from "@/components/develop/pitch-panel";
import { TouchpointForm } from "@/components/develop/touchpoint-form";

export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  call: "Call",
  walk_in: "Walk-in",
  email: "Email",
  text: "Text",
  other: "Note",
};

function refHost(ref: string): string {
  try {
    return new URL(ref).hostname.replace(/^www\./, "");
  } catch {
    return ref.slice(0, 40);
  }
}

export default async function BizLeadDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lead = await getBizLeadBySlug(slug);
  if (!lead) notFound();

  const reviews = lead.reviews ?? [];
  const [touchpoints, pitchResponses, visits, campaigns] = await Promise.all([
    listTouchpoints(lead.id),
    listPitchResponses(lead.id),
    getVisitStats(lead.id),
    listCampaigns(),
  ]);
  const live = isLiveSite(lead);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-dim)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to pipeline
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-2xl font-medium tracking-tight">{lead.name}</h1>
            <p className="text-sm text-[var(--ink-dim)]">
              {[lead.category, lead.city, lead.state].filter(Boolean).join(" · ")}
            </p>
          </div>
          <BizStatusChip status={lead.status} />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--ink-dim)]">
          {lead.google_rating != null && (
            <span className="inline-flex items-center gap-1 text-[var(--amber-soft)]">
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
              {lead.google_rating}
              {lead.reviews_count != null && (
                <span className="text-[var(--ink-faint)]">
                  {" "}
                  · {lead.reviews_count} reviews
                </span>
              )}
            </span>
          )}
          {lead.phone && (
            <a
              href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
              className="inline-flex items-center gap-1 hover:text-[var(--ink)]"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden />
              {lead.phone}
            </a>
          )}
          {lead.address && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {lead.address}
            </span>
          )}
          {lead.google_url && (
            <a
              href={lead.google_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-[var(--ink)]"
            >
              <Globe className="h-3.5 w-3.5" aria-hidden />
              Google Maps
            </a>
          )}
        </div>
      </header>

      {/* Campaign assignment (+ live-site facts once graduated) */}
      <div className="grid gap-3 sm:grid-cols-2">
        <CampaignPicker
          slug={lead.slug}
          campaigns={campaigns}
          current={lead.campaign?.slug ?? null}
        />

        {live && (
          <div className="panel p-4 space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#86efac]">
              Live site
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
              {lead.production_url ? (
                <a
                  href={lead.production_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[var(--amber-soft)] hover:text-[var(--amber)]"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  {lead.live_domain ?? "Open site"}
                </a>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[var(--ink)]">
                  <Globe className="h-3.5 w-3.5" aria-hidden />
                  {lead.live_domain}
                </span>
              )}
              {lead.ssl_state && (
                <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-dim)]">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  SSL · {lead.ssl_state}
                </span>
              )}
            </div>
            {lead.live_at && (
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                Live since {format(new Date(lead.live_at), "MMM d, yyyy")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Demo site generator + preview */}
      <section className="space-y-3">
        <p className="display-eyebrow">DEMO SITE</p>
        <GeneratePanel
          slug={lead.slug}
          initialDemoUrl={lead.demo_url}
          hasReviews={reviews.length > 0}
        />
      </section>

      {/* Site activity: when it was built + who has visited */}
      <section className="space-y-3">
        <p className="display-eyebrow">
          SITE ACTIVITY · <span className="amber">{visits.total}</span>{" "}
          {visits.total === 1 ? "VISIT" : "VISITS"}
        </p>
        <div className="panel p-4 space-y-3 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[var(--ink-dim)]">
            <span>
              <span className="text-[var(--ink-faint)]">Built </span>
              {lead.demo_generated_at
                ? format(new Date(lead.demo_generated_at), "MMM d, yyyy")
                : "not stamped"}
            </span>
            {lead.demo_deployed_at && (
              <span>
                <span className="text-[var(--ink-faint)]">Deployed </span>
                {format(new Date(lead.demo_deployed_at), "MMM d, yyyy")}
              </span>
            )}
            <span>
              <span className="text-[var(--ink-faint)]">Last visit </span>
              {visits.lastVisitAt
                ? format(new Date(visits.lastVisitAt), "MMM d, h:mma")
                : "none yet"}
            </span>
          </div>
          {visits.recent.length === 0 ? (
            <p className="text-xs text-[var(--ink-dim)]">
              No visits recorded yet. Each view of{" "}
              <code className="font-mono text-xs">
                {lead.demo_url ?? `/demos/${lead.slug}/`}
              </code>{" "}
              shows up here.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {visits.recent.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]"
                >
                  <span className="text-[var(--amber-soft)]">
                    {format(new Date(v.created_at), "MMM d, h:mma")}
                  </span>
                  {(v.city || v.country) && (
                    <span>
                      · {[v.city, v.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {v.referrer && (
                    <span className="normal-case tracking-normal text-[var(--ink-dim)]">
                      · via {refHost(v.referrer)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Pitch page generator + preview */}
      <section className="space-y-3">
        <p className="display-eyebrow">PITCH PAGE · HAND-OFF</p>
        <PitchPanel slug={lead.slug} initialPitchUrl={null} />
      </section>

      {/* Pitch follow-up responses captured on the public pitch page */}
      {pitchResponses.length > 0 && (
        <section className="space-y-3">
          <p className="display-eyebrow">
            CALL RESULTS · <span className="amber">{pitchResponses.length}</span>
          </p>
          <ul className="space-y-2">
            {pitchResponses.map((p) => (
              <li key={p.id} className="panel p-3 text-sm space-y-1">
                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
                  {p.outcome && (
                    <span className="text-[var(--amber-soft)]">{p.outcome}</span>
                  )}
                  {p.interest && (
                    <span
                      className={
                        p.interest === "interested"
                          ? "text-[#86efac]"
                          : p.interest === "not_interested"
                            ? "text-[var(--ink-faint)]"
                            : "text-[#fbbf24]"
                      }
                    >
                      · {p.interest}
                    </span>
                  )}
                  <span className="text-[var(--ink-faint)]">
                    · {format(new Date(p.created_at), "MMM d, h:mma")}
                  </span>
                  {p.caller && (
                    <span className="text-[var(--ink-faint)]">· {p.caller}</span>
                  )}
                </div>
                {(p.budget_band || p.timeline || p.best_contact || p.callback_at) && (
                  <p className="text-[var(--ink-dim)] text-xs">
                    {[
                      p.budget_band && `Budget: ${p.budget_band}`,
                      p.timeline && `Timeline: ${p.timeline}`,
                      p.best_contact && `Contact: ${p.best_contact}`,
                      p.callback_at && `Callback: ${p.callback_at}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {p.objections && (
                  <p className="text-[var(--ink)]">
                    <span className="text-[var(--ink-faint)]">Pushback: </span>
                    {p.objections}
                  </p>
                )}
                {p.other_info && (
                  <p className="text-[var(--ink)]">{p.other_info}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Reviews */}
        <section className="space-y-3">
          <p className="display-eyebrow">
            REVIEWS · <span className="amber">{reviews.length}</span> · CONTENT SEED
          </p>
          {reviews.length === 0 ? (
            <p className="text-sm text-[var(--ink-dim)]">
              No reviews captured. Edit{" "}
              <code className="font-mono text-xs">{lead.markdown_path}</code> to
              add them.
            </p>
          ) : (
            <ul className="space-y-2">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className="panel p-3 text-sm text-[var(--ink)]"
                >
                  <p className="leading-relaxed">{r.body}</p>
                  {(r.author || r.rating) && (
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                      {[r.author, r.rating ? `${r.rating}/5` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Outreach */}
        <section className="space-y-3">
          <p className="display-eyebrow">
            OUTREACH · <span className="amber">{touchpoints.length}</span>
          </p>
          <TouchpointForm slug={lead.slug} />
          {touchpoints.length === 0 ? (
            <p className="text-sm text-[var(--ink-dim)]">
              No touchpoints yet. Log a call, walk-in, or email above.
            </p>
          ) : (
            <ul className="space-y-2">
              {touchpoints.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-3 panel p-3 text-sm"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--amber-soft)] shrink-0 pt-0.5">
                    {METHOD_LABEL[t.method] ?? t.method}
                  </span>
                  <div className="min-w-0">
                    {t.note && <p className="text-[var(--ink)]">{t.note}</p>}
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                      {format(new Date(t.occurred_at), "MMM d, h:mma")}
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
