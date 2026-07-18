import { ExecutiveInsightCard } from "@/components/executive/executive-insight-card";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type CommandRoomItem = {
  title: string;
  value: string;
};

type CommandCenterItem = {
  title: string;
  value: string;
  status: string;
};

type ProcurementCommandCenterProps = {
  procurementCommandRoom: CommandRoomItem[];
  procurementCommandRoomStatus: string;
  procurementCommandCenter: CommandCenterItem[];
  commandCenterStatus: string;
  executiveCommandRecommendation: string;
};

export function ProcurementCommandCenter({
  procurementCommandRoom,
  procurementCommandRoomStatus,
  procurementCommandCenter,
  commandCenterStatus,
  executiveCommandRecommendation,
}: ProcurementCommandCenterProps) {
  return (
    <ExecutivePanel variant="boardroom" padding="lg" tone="blue">
      <header className="grid min-w-0 gap-6 border-b border-white/10 pb-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-300 sm:text-xs">
              Procurement Intelligence Command
            </p>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Executive control environment
            </p>
          </div>

          <h2 className="mt-4 max-w-5xl text-3xl font-black leading-[1.08] tracking-tight text-nexus-white sm:text-4xl lg:text-5xl">
            Executive Procurement Command Center
          </h2>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted sm:text-base">
            Unified leadership environment connecting procurement performance,
            supplier strength, risk exposure, benchmark intelligence, command
            readiness, and decision confidence.
          </p>
        </div>

        <div className="grid min-w-[260px] gap-3 sm:grid-cols-2 xl:min-w-[360px]">
          <CommandReadinessStatus
            label="Command room"
            status={procurementCommandRoomStatus}
            tone="blue"
          />

          <CommandReadinessStatus
            label="Control center"
            status={commandCenterStatus}
            tone="gold"
          />
        </div>
      </header>

      <section className="mt-7 min-w-0">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">
              Strategic command layer
            </p>

            <h3 className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl">
              Executive Command Signals
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Consolidated indicators supporting executive oversight of
            procurement readiness, exposure, and strategic performance.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {procurementCommandRoom.map((item) => (
            <ExecutiveMetricCard
              key={item.title}
              label={item.title}
              value={item.value}
              tone="blue"
            />
          ))}
        </div>
      </section>

      <section className="mt-7 min-w-0 rounded-3xl border border-nexus-gold/15 bg-nexus-gold/[0.025] p-5 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Operational control layer
            </p>

            <h3 className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl">
              Procurement Control Signals
            </h3>
          </div>

          <span className="w-fit rounded-full border border-nexus-gold/20 bg-nexus-gold/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-nexus-gold">
            {procurementCommandCenter.length} control signals
          </span>
        </div>

        <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {procurementCommandCenter.map((item) => (
            <ExecutiveMetricCard
              key={item.title}
              label={item.title}
              value={item.value}
              insight={item.status}
              tone="gold"
            />
          ))}
        </div>
      </section>

      <section className="mt-7 min-w-0">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">
              Leadership alignment
            </p>

            <h3 className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl">
              Command Readiness and Executive Direction
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Current command posture translated into leadership guidance and
            prioritized procurement response.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-2">
          <ExecutiveInsightCard
            title={procurementCommandRoomStatus}
            insight={executiveCommandRecommendation}
            recommendation="Use command room signals to align procurement performance, supplier strength, and board confidence."
            impact="Command room readiness is active."
            tone="blue"
          />

          <ExecutiveInsightCard
            title={commandCenterStatus}
            insight={executiveCommandRecommendation}
            recommendation="Prioritize procurement actions with the strongest decision confidence and business impact."
            impact="Command center alignment is active."
            tone="gold"
          />
        </div>
      </section>

      <section className="mt-7 min-w-0 overflow-hidden rounded-3xl border border-blue-300/15 bg-blue-300/[0.035]">
        <div className="grid min-w-0 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r lg:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">
              Executive directive
            </p>

            <p className="mt-3 text-xl font-black leading-7 text-nexus-white">
              Priority Command Position
            </p>

            <p className="mt-3 text-xs font-semibold leading-5 text-nexus-muted">
              Consolidated leadership direction derived from the active command
              environment.
            </p>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-300/20 bg-blue-300/[0.08] text-xs font-black text-blue-300">
                01
              </span>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
                  Leadership recommendation
                </p>

                <p className="mt-3 break-words text-base font-bold leading-8 text-nexus-white [overflow-wrap:anywhere]">
                  {executiveCommandRecommendation}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-nexus-muted">
                Executive ownership required
              </p>

              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-300">
                Command alignment active
              </p>
            </div>
          </div>
        </div>
      </section>
    </ExecutivePanel>
  );
}

function CommandReadinessStatus({
  label,
  status,
  tone,
}: {
  label: string;
  status: string;
  tone: "blue" | "gold";
}) {
  const toneClasses =
    tone === "gold"
      ? "border-nexus-gold/20 bg-nexus-gold/[0.06] text-nexus-gold"
      : "border-blue-300/20 bg-blue-300/[0.06] text-blue-300";

  return (
    <div className={`min-w-0 rounded-2xl border p-4 ${toneClasses}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.17em]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black leading-5 text-nexus-white [overflow-wrap:anywhere]">
        {status}
      </p>
    </div>
  );
}