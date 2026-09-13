import AIConfidenceEngine from "@/components/ai-confidence-engine";
import { ExecutiveAlertsCenter } from "@/components/analytics/executive-alerts-center";
import ExecutiveRecommendations from "@/components/analytics/executive-recommendations";
import DailyExecutiveBriefing from "@/components/executive/daily-executive-briefing";
import type { DecisionSupportReadiness } from "@/lib/analytics/executive/decision-support-readiness";
import type { CommercialEvidenceState } from "@/lib/analytics/commercial/commercial-insights";

type ExecutiveAlert = {
  level: "healthy" | "opportunity" | "warning";
  title: string;
  message: string;
};

type ExecutiveRecommendation = {
  role: string;
  action: string;
};

type DailyBriefingItem = {
  title: string;
  message: string;
};

type IntelligenceDashboardProps = {
  executiveAlerts: ExecutiveAlert[];
  executiveRecommendations: ExecutiveRecommendation[];
  dailyExecutiveBriefing: DailyBriefingItem[];

  decisionSupportReadiness: DecisionSupportReadiness | null;
  supplierReliabilityScore: number | null;
  supplierCommercialEvidenceState: CommercialEvidenceState;
};

export function IntelligenceDashboard({
  executiveAlerts,
  executiveRecommendations,
  dailyExecutiveBriefing,
  decisionSupportReadiness,
  supplierReliabilityScore,
  supplierCommercialEvidenceState,
}: IntelligenceDashboardProps) {
  const unavailableEvidenceLabel =
    supplierCommercialEvidenceState === "available"
      ? null
      : supplierCommercialEvidenceState === "access-restricted"
        ? "Access Restricted"
        : supplierCommercialEvidenceState === "policy-locked"
          ? "Policy Locked"
          : "Insufficient Data";

  return (
    <section
      aria-labelledby="intelligence-command-layer-heading"
      className="mt-8"
    >
      <header className="rounded-[34px] border border-white/10 bg-[#061426]/88 p-6 text-white shadow-executive sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.68fr)_minmax(280px,0.32fr)] xl:items-end">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#C8A646]">
              Intelligence Command Layer
            </p>

            <h2
              id="intelligence-command-layer-heading"
              className="mt-4 max-w-4xl text-3xl font-black tracking-tight text-white sm:text-4xl"
            >
              Executive Procurement Intelligence and Decision Assurance
            </h2>

            <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
              Leadership signals, accountable directives, daily decision
              briefings, and decision-evidence readiness are consolidated into
              one executive operating layer.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Active Signals
              </p>

              <p className="mt-2 text-2xl font-black text-white">
                {executiveAlerts.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Directives
              </p>

              <p className="mt-2 text-2xl font-black text-white">
                {executiveRecommendations.length}
              </p>
            </div>
          </div>
        </div>
      </header>

      <ExecutiveAlertsCenter executiveAlerts={executiveAlerts} />

      <ExecutiveRecommendations
        executiveRecommendations={executiveRecommendations}
      />

      <DailyExecutiveBriefing
        dailyExecutiveBriefing={dailyExecutiveBriefing}
      />

      {supplierCommercialEvidenceState !== "available" ||
      decisionSupportReadiness === null ||
      supplierReliabilityScore === null ? (
        <div className="mt-6 rounded-3xl border border-amber-300/15 bg-amber-400/[0.04] p-5 text-white">
          <p className="text-sm font-black">
            Commercial Evidence {unavailableEvidenceLabel ?? "Insufficient Data"}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
            Supplier reliability evidence is unavailable under the current
            commercial evidence controls.
          </p>
        </div>
      ) : (
        <AIConfidenceEngine
          decisionSupportReadiness={decisionSupportReadiness}
          supplierReliabilityScore={supplierReliabilityScore}
        />
      )}
    </section>
  );
}
