import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveSignal } from "@/components/rfq-workspace/shared/executive-signal";
import { ExecutiveStatusBadge } from "@/components/rfq-workspace/shared/executive-status-badge";
import type {
  ExecutiveIntelligence,
  ExecutiveScenario,
  ExecutiveTone,
} from "@/lib/executive/executive-types";
import type { ExecutiveQuote } from "@/types/executive";

type AwardScenarioSimulatorProps = {
  isOwner: boolean;
  commercialEvaluationUnlocked: boolean;
  recommendedQuote: ExecutiveQuote | null;
  quoteCount: number;
  executive: ExecutiveIntelligence;
};

function getScenarioStatusLabel(tone: ExecutiveTone) {
  if (tone === "success") return "Preferred";
  if (tone === "info") return "Viable";
  if (tone === "warning") return "Review";
  if (tone === "risk") return "High Exposure";

  return "Available";
}

export function AwardScenarioSimulator({
  isOwner,
  commercialEvaluationUnlocked,
  recommendedQuote,
  quoteCount,
  executive,
}: AwardScenarioSimulatorProps) {
  if (!isOwner) return null;

  if (!commercialEvaluationUnlocked || !recommendedQuote) {
    return (
      <ExecutivePanel className="mt-8" padding="lg" tone="gold">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
              Award Scenario Simulator
            </p>

            <h2 className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl">
              Scenario Modeling Awaiting Activation
            </h2>

            <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
              Award scenario modeling becomes available after commercial
              opening and once Nexus Pavilion has a recommended supplier path
              to evaluate.
            </p>
          </div>

          <div className="shrink-0">
            <ExecutiveStatusBadge tone="warning">
              Not Operational
            </ExecutiveStatusBadge>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <LockedRequirement
            label="Commercial evaluation opened"
            ready={commercialEvaluationUnlocked}
          />

          <LockedRequirement
            label="Comparative quote intelligence available"
            ready={quoteCount > 0}
          />

          <LockedRequirement
            label="Recommended supplier path established"
            ready={Boolean(recommendedQuote)}
          />
        </div>
      </ExecutivePanel>
    );
  }

  const scenarios = executive.scenarios;
  const primaryScenario = scenarios[0];

  return (
    <ExecutivePanel className="mt-8 overflow-hidden p-0" tone="gold">
      <section aria-labelledby="award-scenario-simulator-title">
        <div className="border-b border-white/10 p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
                  Award Scenario Simulator
                </p>

                <ExecutiveStatusBadge tone="success">
                  Operational
                </ExecutiveStatusBadge>
              </div>

              <h2
                id="award-scenario-simulator-title"
                className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl"
              >
                Executive Award Path Comparison
              </h2>

              <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
                Compare immediate award, pre-award negotiation, RFQ extension,
                and rebid pathways using commercial impact, schedule exposure,
                procurement risk, and board-readiness signals.
              </p>
            </div>

            {primaryScenario ? (
              <div className="min-w-0 rounded-3xl border border-nexus-gold/20 bg-black/25 px-5 py-5 sm:px-6 xl:max-w-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-nexus-muted">
                    Primary Path
                  </p>

                  <ExecutiveStatusBadge tone={primaryScenario.tone}>
                    {getScenarioStatusLabel(primaryScenario.tone)}
                  </ExecutiveStatusBadge>
                </div>

                <p className="mt-3 break-words text-xl font-black leading-tight text-nexus-white sm:text-2xl">
                  {primaryScenario.title}
                </p>

                <p className="mt-3 break-words text-xs font-bold leading-5 text-nexus-muted">
                  {executive.recommendation.recommendation}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {scenarios.length > 0 ? (
          <ol
            className="grid gap-5 p-6 sm:p-8 xl:grid-cols-2 2xl:grid-cols-4"
            aria-label="Available executive award scenarios"
          >
            {scenarios.map((scenario, index) => (
              <ScenarioCard
                key={scenario.title}
                scenario={scenario}
                index={index}
                primary={index === 0}
              />
            ))}
          </ol>
        ) : (
          <div className="p-6 sm:p-8">
            <ExecutivePanel
              variant="operational"
              padding="md"
              tone="neutral"
            >
              <p className="text-sm font-black text-nexus-white">
                No Award Scenarios Available
              </p>

              <p className="mt-2 text-sm font-semibold leading-6 text-nexus-muted">
                Scenario intelligence is operational, but the current RFQ does
                not yet contain sufficient decision signals to generate a
                comparative award path.
              </p>
            </ExecutivePanel>
          </div>
        )}

        <div className="border-t border-white/10 bg-black/20 p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
                Executive Decision Guidance
              </p>

              <p className="mt-4 max-w-4xl break-words text-sm font-bold leading-7 text-nexus-white">
                {executive.recommendation.recommendation}
              </p>

              <p className="mt-4 max-w-4xl text-xs font-semibold leading-5 text-nexus-muted">
                Scenario outputs support executive and procurement review.
                Final award authority remains subject to approved governance,
                commercial authorization, supplier due diligence, and
                documented decision accountability.
              </p>
            </div>

            {primaryScenario ? (
              <div className="shrink-0">
                <ExecutiveStatusBadge tone={primaryScenario.tone}>
                  Primary: {primaryScenario.title}
                </ExecutiveStatusBadge>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </ExecutivePanel>
  );
}

function LockedRequirement({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <ExecutivePanel
      variant="operational"
      padding="sm"
      tone={ready ? "success" : "neutral"}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 pt-0.5">
          <ExecutiveSignal positive={ready} />
        </div>

        <p className="break-words text-sm font-bold leading-6 text-nexus-muted">
          {label}
        </p>
      </div>
    </ExecutivePanel>
  );
}

function ScenarioCard({
  scenario,
  index,
  primary,
}: {
  scenario: ExecutiveScenario;
  index: number;
  primary: boolean;
}) {
  const statusLabel = getScenarioStatusLabel(scenario.tone);
  const scenarioId = `award-scenario-${index + 1}`;

  return (
    <li
      className={`flex min-w-0 flex-col rounded-[32px] border p-5 transition duration-300 hover:bg-white/[0.06] hover:shadow-executive sm:p-6 ${
        primary
          ? "border-nexus-gold/30 bg-nexus-gold/[0.07]"
          : "border-white/10 bg-white/[0.045]"
      }`}
      aria-labelledby={`${scenarioId}-title`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-nexus-muted">
            Scenario {index + 1}
          </p>

          <h3
            id={`${scenarioId}-title`}
            className="mt-2 break-words text-xl font-black leading-tight text-nexus-white sm:text-2xl"
          >
            {scenario.title}
          </h3>
        </div>

        <div className="shrink-0 self-start">
          <ExecutiveStatusBadge tone={scenario.tone}>
            {primary ? "Primary" : statusLabel}
          </ExecutiveStatusBadge>
        </div>
      </div>

      <p className="mt-4 break-words text-sm font-bold leading-7 text-nexus-muted">
        {scenario.recommendation}
      </p>

      <dl className="mt-6 grid gap-3">
        <SignalBlock
          title="Commercial Impact"
          value={scenario.costImpact}
        />

        <SignalBlock
          title="Schedule Impact"
          value={scenario.timeImpact}
        />

        <SignalBlock
          title="Risk Exposure"
          value={scenario.riskImpact}
        />

        <SignalBlock
          title="Board Assessment"
          value={scenario.boardView}
        />
      </dl>
    </li>
  );
}

function SignalBlock({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4">
      <dt className="text-[10px] font-black uppercase tracking-[0.2em] text-nexus-muted">
        {title}
      </dt>

      <dd className="mt-2 break-words text-xs font-bold leading-5 text-nexus-white">
        {value}
      </dd>
    </div>
  );
}