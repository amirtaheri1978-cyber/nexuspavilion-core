import { ExecutivePanel } from "@/components/executive/executive-panel";

type ExecutiveAlert = {
  title: string;
  message: string;
  level: "healthy" | "opportunity" | "warning";
};

type ExecutiveAlertsCenterProps = {
  executiveAlerts: ExecutiveAlert[];
};

const alertLevelConfig = {
  healthy: {
    label: "Controlled",
    dotClass: "bg-emerald-400",
    badgeClass:
      "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  },
  opportunity: {
    label: "Opportunity",
    dotClass: "bg-[#C8A646]",
    badgeClass:
      "border-[#C8A646]/25 bg-[#C8A646]/10 text-[#F4D67A]",
  },
  warning: {
    label: "Attention",
    dotClass: "bg-amber-400",
    badgeClass:
      "border-amber-400/20 bg-amber-400/10 text-amber-200",
  },
} satisfies Record<
  ExecutiveAlert["level"],
  {
    label: string;
    dotClass: string;
    badgeClass: string;
  }
>;

export function ExecutiveAlertsCenter({
  executiveAlerts,
}: ExecutiveAlertsCenterProps) {
  const highestPriorityAlert =
    executiveAlerts.find((alert) => alert.level === "warning") ??
    executiveAlerts.find((alert) => alert.level === "opportunity") ??
    executiveAlerts[0];

  const panelTone =
    highestPriorityAlert?.level === "warning"
      ? "risk"
      : highestPriorityAlert?.level === "opportunity"
        ? "gold"
        : "success";

  return (
    <ExecutivePanel
      aria-labelledby="executive-alerts-heading"
      className="mt-8"
      padding="lg"
      tone={panelTone}
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(0,0.36fr)_minmax(0,0.64fr)]">
        <header className="flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-nexus-gold">
              Executive Signal Rail
            </p>

            <h2
              id="executive-alerts-heading"
              className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl"
            >
              Priority Signals Requiring Leadership Visibility
            </h2>

            <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-nexus-muted">
              Procurement risk, supplier activity, opportunity signals, and
              operating conditions are ranked for rapid executive review.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-muted">
              Active Signal Position
            </p>

            <p className="mt-3 text-3xl font-black text-nexus-white">
              {executiveAlerts.length}
            </p>

            <p className="mt-2 text-sm font-semibold leading-6 text-nexus-muted">
              {executiveAlerts.length === 1
                ? "executive signal currently active"
                : "executive signals currently active"}
            </p>
          </div>
        </header>

        <div className="divide-y divide-white/10 border-y border-white/10">
          {executiveAlerts.length > 0 ? (
            executiveAlerts.map((alert, index) => {
              const config = alertLevelConfig[alert.level];

              return (
                <article
                  key={`${alert.title}-${index}`}
                  className="grid gap-4 py-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start"
                >
                  <div
                    aria-hidden="true"
                    className={`mt-1.5 h-2.5 w-2.5 rounded-full ${config.dotClass}`}
                  />

                  <div className="min-w-0">
                    <h3 className="break-words text-base font-black leading-6 text-nexus-white">
                      {alert.title}
                    </h3>

                    <p className="mt-2 break-words text-sm font-semibold leading-6 text-nexus-muted">
                      {alert.message}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${config.badgeClass}`}
                  >
                    {config.label}
                  </span>
                </article>
              );
            })
          ) : (
            <div className="py-8">
              <p className="text-base font-black text-nexus-white">
                No material executive signals detected
              </p>

              <p className="mt-2 max-w-xl text-sm font-semibold leading-7 text-nexus-muted">
                Current procurement indicators do not require immediate
                leadership escalation.
              </p>
            </div>
          )}
        </div>
      </div>
    </ExecutivePanel>
  );
}