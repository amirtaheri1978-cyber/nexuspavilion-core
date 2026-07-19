import { ExecutivePanel } from "@/components/executive/executive-panel";

type BoardAutomationItem = {
  title: string;
  status: string;
};

type BoardPackageStage = {
  stage: string;
  status: string;
};

type BoardDistributionChannel = {
  channel: string;
  status: string;
};

type BoardApprovalStage = {
  stage: string;
  status: string;
};

type BoardAutomationCenterProps = {
  boardAutomationItems: BoardAutomationItem[];
  boardAutomationStatus: string;
  boardPackageLifecycle: string;
  boardPackageStages: BoardPackageStage[];
  boardDistributionChannels: BoardDistributionChannel[];
  boardDistributionReadiness: string;
  boardApprovalStages: BoardApprovalStage[];
  boardApprovalStatus: string;
};

export function BoardAutomationCenter({
  boardAutomationItems,
  boardAutomationStatus,
  boardPackageLifecycle,
  boardPackageStages,
  boardDistributionChannels,
  boardDistributionReadiness,
  boardApprovalStages,
  boardApprovalStatus,
}: BoardAutomationCenterProps) {
  const hasAutomationItems = boardAutomationItems.length > 0;
  const hasLifecycleStages = boardPackageStages.length > 0;
  const hasDistributionChannels = boardDistributionChannels.length > 0;
  const hasApprovalStages = boardApprovalStages.length > 0;

  const hasWorkflowData =
    hasAutomationItems ||
    hasLifecycleStages ||
    hasDistributionChannels ||
    hasApprovalStages;

  return (
    <ExecutivePanel
      aria-labelledby="board-automation-center-heading"
      padding="lg"
    >
      <header className="grid min-w-0 gap-6 border-b border-white/10 pb-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-nexus-gold sm:text-xs">
              Board Automation Center
            </p>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Board reporting operations
            </p>
          </div>

          <h2
            id="board-automation-center-heading"
            className="mt-4 max-w-5xl text-3xl font-black leading-[1.08] tracking-tight text-nexus-white sm:text-4xl lg:text-5xl"
          >
            Automated Board Package Workflow
          </h2>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted sm:text-base">
            Governance control layer for board package readiness, lifecycle
            progression, executive approval requirements, and authorized
            distribution status before report generation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:flex-col xl:items-end">
          <WorkflowStatusBadge active={hasWorkflowData} />

          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
            {boardPackageStages.length +
              boardDistributionChannels.length +
              boardApprovalStages.length}{" "}
            workflow controls
          </p>
        </div>
      </header>

      <section
        aria-labelledby="automation-control-position-heading"
        className="mt-7 overflow-hidden rounded-3xl border border-nexus-gold/20 bg-nexus-gold/[0.045]"
      >
        <div className="grid min-w-0 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="border-b border-white/10 p-5 sm:p-6 xl:border-b-0 xl:border-r">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Automation control status
            </p>

            <h3
              id="automation-control-position-heading"
              className="mt-3 break-words text-2xl font-black tracking-tight text-nexus-white"
            >
              {boardAutomationStatus}
            </h3>

            <p className="mt-3 text-xs font-semibold leading-6 text-nexus-muted">
              Current operating position of the automated board package
              workflow.
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-nexus-muted">
                Package lifecycle
              </p>

              <p className="mt-2 break-words text-sm font-black leading-6 text-nexus-white [overflow-wrap:anywhere]">
                {boardPackageLifecycle}
              </p>
            </div>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-nexus-muted">
                  Workflow assurance signals
                </p>

                <h3 className="mt-2 text-xl font-black tracking-tight text-nexus-white">
                  Board Package Control Position
                </h3>
              </div>

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-gold">
                Executive governance review
              </p>
            </div>

            {hasAutomationItems ? (
              <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {boardAutomationItems.map((item, index) => (
                  <AutomationTile
                    key={item.title}
                    label={item.title}
                    value={item.status}
                    position={index + 1}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No automation controls available"
                description="Board automation control indicators are currently unavailable."
              />
            )}
          </div>
        </div>
      </section>

      <AutomationGroup
        eyebrow="Package progression"
        title="Board Package Lifecycle"
        description="Operational stages governing the preparation and validation of the board reporting package."
        items={boardPackageStages.map((stage) => ({
          label: stage.stage,
          value: stage.status,
        }))}
        emptyTitle="No lifecycle stages available"
        emptyDescription="Board package lifecycle stages are currently unavailable."
      />

      <section
        aria-labelledby="board-distribution-heading"
        className="mt-7 min-w-0"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Controlled distribution
            </p>

            <h3
              id="board-distribution-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Board Distribution Intelligence
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Distribution channels remain subject to readiness, confidence, and
            governance authorization requirements.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
          <div className="min-w-0">
            {hasDistributionChannels ? (
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                {boardDistributionChannels.map((item, index) => (
                  <AutomationTile
                    key={`Board Distribution Intelligence-${item.channel}`}
                    label={item.channel}
                    value={item.status}
                    position={index + 1}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No distribution channels available"
                description="Board package distribution channels are currently unavailable."
              />
            )}
          </div>

          <ExecutiveStatusBlock
            eyebrow="Distribution authorization"
            title="Distribution Readiness"
            value={boardDistributionReadiness}
            description="Executive board packages are distributed only after readiness, confidence, and governance validation thresholds are achieved."
          />
        </div>
      </section>

      <section
        aria-labelledby="board-approval-workflow-heading"
        className="mt-7 min-w-0"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Governance authorization
            </p>

            <h3
              id="board-approval-workflow-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Board Approval Workflow
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Approval stages define the governance sequence required before
            package release and board distribution.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
          <div className="min-w-0">
            {hasApprovalStages ? (
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                {boardApprovalStages.map((item, index) => (
                  <AutomationTile
                    key={`Board Approval Workflow-${item.stage}`}
                    label={item.stage}
                    value={item.status}
                    position={index + 1}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No approval stages available"
                description="Board package approval stages are currently unavailable."
              />
            )}
          </div>

          <ExecutiveStatusBlock
            eyebrow="Governance decision"
            title="Approval Status"
            value={boardApprovalStatus}
            description="Board package approval requires executive readiness, governance review, risk validation, and distribution authorization."
          />
        </div>
      </section>
    </ExecutivePanel>
  );
}

function AutomationTile({
  label,
  value,
  position,
}: {
  label: string;
  value: string;
  position: number;
}) {
  return (
    <article className="flex min-w-0 flex-col rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/10 text-[10px] font-black text-nexus-muted">
          {String(position).padStart(2, "0")}
        </span>

        <div className="min-w-0">
          <p className="break-words text-[10px] font-black uppercase tracking-[0.17em] text-nexus-gold [overflow-wrap:anywhere]">
            {label}
          </p>

          <h4 className="mt-3 break-words text-lg font-black leading-7 text-nexus-white [overflow-wrap:anywhere]">
            {value}
          </h4>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-muted">
          Workflow control
        </p>

        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-gold">
          Status validated
        </p>
      </div>
    </article>
  );
}

function AutomationGroup({
  eyebrow,
  title,
  description,
  items,
  emptyTitle,
  emptyDescription,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: { label: string; value: string }[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <section
      aria-labelledby={`${title.toLowerCase().replace(/\s+/g, "-")}-heading`}
      className="mt-7 min-w-0"
    >
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
            {eyebrow}
          </p>

          <h3
            id={`${title.toLowerCase().replace(/\s+/g, "-")}-heading`}
            className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
          >
            {title}
          </h3>
        </div>

        <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
          {description}
        </p>
      </div>

      {items.length > 0 ? (
        <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item, index) => (
            <AutomationTile
              key={`${title}-${item.label}`}
              label={item.label}
              value={item.value}
              position={index + 1}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
        />
      )}
    </section>
  );
}

function ExecutiveStatusBlock({
  eyebrow,
  title,
  value,
  description,
}: {
  eyebrow: string;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <article className="flex min-w-0 flex-col rounded-3xl border border-nexus-gold/20 bg-nexus-gold/[0.045] p-5 sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
        {eyebrow}
      </p>

      <h4 className="mt-3 text-sm font-black uppercase tracking-[0.15em] text-nexus-muted">
        {title}
      </h4>

      <p className="mt-4 break-words text-2xl font-black leading-8 text-nexus-white [overflow-wrap:anywhere]">
        {value}
      </p>

      <p className="mt-4 flex-1 text-sm font-semibold leading-7 text-nexus-muted">
        {description}
      </p>

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-gold">
          Executive validation required
        </p>
      </div>
    </article>
  );
}

function WorkflowStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${
        active
          ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
          : "border-orange-300/20 bg-orange-400/10 text-orange-300"
      }`}
    >
      {active ? "Workflow Available" : "Insufficient Data"}
    </span>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-5 rounded-3xl border border-dashed border-white/15 bg-white/[0.025] p-8 text-center sm:p-10">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
        Insufficient Data
      </p>

      <p className="mt-3 text-base font-black text-nexus-white">
        {title}
      </p>

      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-nexus-muted">
        {description}
      </p>
    </div>
  );
}