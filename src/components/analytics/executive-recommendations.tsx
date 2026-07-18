import { ExecutivePanel } from "@/components/executive/executive-panel";

type ExecutiveRecommendation = {
  role: string;
  action: string;
};

interface ExecutiveRecommendationsProps {
  executiveRecommendations: ExecutiveRecommendation[];
}

function getExecutionHorizon(index: number) {
  if (index === 0) {
    return "Immediate";
  }

  if (index === 1) {
    return "30 Days";
  }

  if (index === 2) {
    return "90 Days";
  }

  return "Strategic";
}

function getPriorityLabel(index: number) {
  return `Priority ${String(index + 1).padStart(2, "0")}`;
}

export default function ExecutiveRecommendations({
  executiveRecommendations,
}: ExecutiveRecommendationsProps) {
  const activeDirectiveCount = executiveRecommendations.length;

  return (
    <ExecutivePanel
      aria-labelledby="executive-action-plan-heading"
      className="mt-8"
      padding="none"
      tone="gold"
    >
      <div className="grid lg:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)]">
        <header className="border-b border-white/10 p-5 sm:p-6 lg:border-b-0 lg:border-r lg:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-nexus-gold">
            Executive Mission Command
          </p>

          <h2
            id="executive-action-plan-heading"
            className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl"
          >
            Leadership Directive Queue
          </h2>

          <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-nexus-muted">
            Procurement intelligence is translated into accountable leadership
            directives, assigned by executive owner and ordered by execution
            horizon.
          </p>

          <div className="mt-8 rounded-2xl border border-[#C8A646]/20 bg-[#C8A646]/10 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F4D67A]">
              Command Status
            </p>

            <p className="mt-3 text-xl font-black text-nexus-white">
              {activeDirectiveCount > 0
                ? "Leadership Action Required"
                : "No Active Directive"}
            </p>

            <p className="mt-2 text-sm font-semibold leading-6 text-nexus-muted">
              {activeDirectiveCount === 1
                ? "1 leadership directive is currently available for executive review."
                : `${activeDirectiveCount} leadership directives are currently available for executive review.`}
            </p>
          </div>
        </header>

        <div className="divide-y divide-white/10">
          {activeDirectiveCount > 0 ? (
            executiveRecommendations.map((item, index) => (
              <article
                key={`${item.role}-${index}`}
                className="grid gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,0.28fr)_minmax(0,0.72fr)] lg:p-8"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-nexus-gold">
                    {getPriorityLabel(index)}
                  </p>

                  <h3 className="mt-2 break-words text-lg font-black leading-6 text-nexus-white">
                    {item.role}
                  </h3>

                  <span className="mt-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
                    {getExecutionHorizon(index)}
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold leading-7 text-slate-200">
                    {item.action}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#2CC4E8]/20 bg-[#2CC4E8]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#9BE8F8]">
                      Executive Ownership
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
                      Decision Tracked
                    </span>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="p-5 sm:p-6 lg:p-8">
              <p className="text-lg font-black text-nexus-white">
                No executive intervention currently required
              </p>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-nexus-muted">
                Current procurement intelligence does not indicate a material
                leadership action. New directives will appear when validated
                risk, opportunity, or performance signals require executive
                ownership.
              </p>
            </div>
          )}
        </div>
      </div>
    </ExecutivePanel>
  );
}