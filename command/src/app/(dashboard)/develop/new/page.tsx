import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { IntakeForm } from "@/components/develop/intake-form";

export const dynamic = "force-dynamic";

export default function NewBizLeadPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/develop"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-dim)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to pipeline
        </Link>
        <p className="eyebrow">
          <span className="amber">D</span> · DEVELOP · NEW LEAD
        </p>
        <h1 className="text-2xl font-medium tracking-tight">Add a business</h1>
        <p className="text-sm text-[var(--ink-dim)] max-w-2xl">
          Qualify on Google Maps first: no website, 4.2 or better, 15 or more
          reviews, a phone and an address. Then paste the best reviews below.
        </p>
      </header>

      <IntakeForm />
    </div>
  );
}
