import { CalendarClock, FileText, Sparkles, Users } from "lucide-react";

/*
  Phase 0 dashboard placeholder.
  Proves the HUD-dark theme, font stack, and layout chrome all work end to
  end. Real metrics, the kanban, and the deadline radar arrive in phases 1
  through 4. See funding/grants/_command-center-prd.md section 10.
*/

const pillars = [
  {
    letter: "H",
    word: "Holistic",
    line: "One source of truth",
    detail:
      "Every grant, funder, retro, follow-up, and boilerplate snippet visible in one bridge. Markdown is canonical.",
    icon: FileText,
  },
  {
    letter: "A",
    word: "Approach",
    line: "The operator's methodology",
    detail:
      "Fit-score, kanban, deadline radar, and boilerplate library encode the way HAND chooses to work.",
    icon: Sparkles,
  },
  {
    letter: "N",
    word: "Nurture",
    line: "Relationships and voice",
    detail:
      "Touchpoint log tied to the funder, not the grant. Boilerplate carries voice across applications.",
    icon: Users,
  },
  {
    letter: "D",
    word: "Develop",
    line: "Pipeline growth, learning loops",
    detail:
      "Discovery curation. Fit assessment as a first-class action. Win-rate, cycle-time, concentration analytics.",
    icon: CalendarClock,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="eyebrow">
          <span className="amber">INITIALIZING</span> SOVEREIGN RECIPROCATE ·
          BRIDGE READY
        </p>
        <h1 className="text-2xl font-medium tracking-tight">
          A bridge for HAND&apos;s grant program
        </h1>
        <p className="text-sm text-[var(--ink-dim)] max-w-2xl">
          Phase 0 scaffold. The chrome, theme, auth, and loader hand-off are
          live. The kanban, markdown ingest, funder library, and drafting
          assistant arrive in phases 1 through 4.
        </p>
      </header>

      <section
        aria-labelledby="pillars-heading"
        className="space-y-3"
      >
        <h2 id="pillars-heading" className="eyebrow">
          THE FOUR PILLARS
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <article
                key={p.letter}
                className="panel relative overflow-hidden p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">
                      <span className="amber">{p.letter}</span> · {p.line}
                    </p>
                    <h3 className="mt-2 text-lg font-medium tracking-tight">
                      {p.word}
                    </h3>
                  </div>
                  <Icon
                    className="h-4 w-4 text-[var(--ink-faint)]"
                    aria-hidden
                  />
                </div>
                <p className="mt-3 text-sm text-[var(--ink-dim)] leading-relaxed">
                  {p.detail}
                </p>
                <div className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">
                  awaiting data · phase 1+
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="state-heading"
        className="panel p-5 space-y-3"
      >
        <h2 id="state-heading" className="eyebrow">
          SCAFFOLD STATE
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
              theme
            </dt>
            <dd className="mt-1 text-[var(--ink)]">
              HUD-dark, tokens ported from the loader
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
              auth
            </dt>
            <dd className="mt-1 text-[var(--ink)]">
              Supabase SSR wired (env vars pending)
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
              loader
            </dt>
            <dd className="mt-1 text-[var(--ink)]">
              3D hand cycles H · A · N · D, hands off at 1.4s
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
              data
            </dt>
            <dd className="mt-1 text-[var(--ink)]">
              none yet, markdown ingest lands in phase 1
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
              host
            </dt>
            <dd className="mt-1 text-[var(--ink)]">
              localhost only, bound to 127.0.0.1
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
              audit
            </dt>
            <dd className="mt-1 text-[var(--ink)]">
              git history is the audit log, every save is a diff
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
