import { ExecutivePanel } from "@/components/executive/executive-panel";

type ExecutivePresentationExport = {
  title: string;
  status: string;
  audience: string;
};

type ExecutivePresentationCenterProps = {
  executivePresentationExports: ExecutivePresentationExport[];
  exportReadinessStatus: string;
};

export function ExecutivePresentationCenter({
  executivePresentationExports,
  exportReadinessStatus,
}: ExecutivePresentationCenterProps) {
  const hasExports = executivePresentationExports.length > 0;

  return (
    <ExecutivePanel
      aria-labelledby="executive-presentation-center-heading"
      padding="lg"
    >
      <header className="grid min-w-0 gap-6 border-b border-white/10 pb-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-nexus-gold sm:text-xs">
              Executive Presentation Export Layer
            </p>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Leadership communication governance
            </p>
          </div>

          <h2
            id="executive-presentation-center-heading"
            className="mt-4 max-w-5xl text-3xl font-black leading-[1.08] tracking-tight text-nexus-white sm:text-4xl lg:text-5xl"
          >
            Executive Presentation Center
          </h2>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted sm:text-base">
            Executive-ready presentation packages structured for board
            members, enterprise leadership, procurement leadership, and
            strategic planning review.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:flex-col xl:items-end">
          <AvailabilityBadge active={hasExports} />

          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
            {executivePresentationExports.length} presentation packages
          </p>
        </div>
      </header>

      <section
        aria-labelledby="export-readiness-heading"
        className="mt-7 overflow-hidden rounded-3xl border border-nexus-gold/20 bg-nexus-gold/[0.045]"
      >
        <div className="grid min-w-0 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="border-b border-white/10 p-5 sm:p-6 xl:border-b-0 xl:border-r">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Export readiness
            </p>

            <h3
              id="export-readiness-heading"
              className="mt-3 break-words text-2xl font-black leading-8 text-nexus-white [overflow-wrap:anywhere]"
            >
              {exportReadinessStatus}
            </h3>

            <p className="mt-3 text-xs font-semibold leading-6 text-nexus-muted">
              Current readiness position for executive presentation package
              preparation and leadership review.
            </p>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Executive communication assurance
            </p>

            <h3 className="mt-3 text-xl font-black tracking-tight text-nexus-white sm:text-2xl">
              Validated Presentation Intelligence
            </h3>

            <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
              Executive presentation packages are generated only from
              validated procurement intelligence, readiness signals,
              benchmark analysis, and board-level decision data.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ReadinessSignal
                label="Package Availability"
                value={
                  hasExports
                    ? `${executivePresentationExports.length} available`
                    : "Insufficient Data"
                }
              />

              <ReadinessSignal
                label="Leadership Review"
                value={exportReadinessStatus}
              />
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="presentation-portfolio-heading"
        className="mt-7 min-w-0"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Presentation portfolio
            </p>

            <h3
              id="presentation-portfolio-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Executive Communication Packages
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Presentation outputs remain aligned to the exact executive
            audiences, package titles, and readiness statuses supplied by the
            platform.
          </p>
        </div>

        {hasExports ? (
          <div className="mt-5 grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {executivePresentationExports.map((item, index) => (
              <PresentationExportCard
                key={item.title}
                item={item}
                position={index + 1}
              />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>
    </ExecutivePanel>
  );
}

function PresentationExportCard({
  item,
  position,
}: {
  item: ExecutivePresentationExport;
  position: number;
}) {
  return (
    <article className="flex min-w-0 flex-col rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-nexus-gold/20 bg-nexus-gold/[0.07] text-[10px] font-black text-nexus-gold">
            {String(position).padStart(2, "0")}
          </span>

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
              Intended audience
            </p>

            <p className="mt-1 break-words text-[10px] font-black uppercase tracking-[0.17em] text-nexus-gold [overflow-wrap:anywhere]">
              {item.audience}
            </p>
          </div>
        </div>

        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-nexus-muted">
          Executive
        </span>
      </div>

      <h4 className="mt-5 break-words text-xl font-black leading-7 text-nexus-white [overflow-wrap:anywhere]">
        {item.title}
      </h4>

      <div className="mt-5 flex-1 rounded-2xl border border-white/10 bg-black/10 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
          Package status
        </p>

        <p className="mt-2 break-words text-sm font-black leading-6 text-nexus-white [overflow-wrap:anywhere]">
          {item.status}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-muted">
          Communication package
        </p>

        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-gold">
          Leadership review
        </p>
      </div>
    </article>
  );
}

function ReadinessSignal({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/10 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black leading-6 text-nexus-white [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}

function AvailabilityBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${
        active
          ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
          : "border-orange-300/20 bg-orange-400/10 text-orange-300"
      }`}
    >
      {active ? "Packages Available" : "Insufficient Data"}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="mt-5 rounded-3xl border border-dashed border-white/15 bg-white/[0.025] p-8 text-center sm:p-10">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
        Insufficient Data
      </p>

      <p className="mt-3 text-base font-black text-nexus-white">
        No executive presentation packages are available
      </p>

      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-nexus-muted">
        Presentation outputs will appear when validated executive intelligence
        and audience-specific reporting packages are available.
      </p>
    </div>
  );
}