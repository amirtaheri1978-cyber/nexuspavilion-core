import { ExecutiveInsightCard } from "@/components/executive/executive-insight-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type RFQExecutiveTimelineItem = {
  label: string;
  value: string;
};

type RFQExecutiveGuidanceProps = {
  timeline: RFQExecutiveTimelineItem[];
  recommendations: string[];
};

export function RFQExecutiveGuidance({
  timeline,
  recommendations,
}: RFQExecutiveGuidanceProps) {
  return (
    <div className="grid gap-6">
      <ExecutivePanel padding="lg" tone="blue">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#9BE8F8]">
          Executive Timeline Prediction
        </p>

        <h2 className="mt-3 text-3xl font-black text-nexus-white">
          Forecasted Procurement Path
        </h2>

        <div className="mt-6 grid gap-3">
          {timeline.map((item, index) => (
            <ExecutivePanel
              key={item.label}
              variant="operational"
              padding="sm"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm font-black text-nexus-white">
                  {index + 1}
                </div>

                <div>
                  <p className="text-sm font-black text-nexus-white">
                    {item.label}
                  </p>

                  <p className="mt-1 text-sm font-bold text-nexus-muted">
                    {item.value}
                  </p>
                </div>
              </div>
            </ExecutivePanel>
          ))}
        </div>
      </ExecutivePanel>

      <ExecutiveInsightCard
        title="Smart Recommendations"
        insight="Nexus Pavilion is monitoring this RFQ and surfacing procurement actions that can improve readiness, supplier clarity, and award confidence."
        recommendation={recommendations.join(" ")}
        tone="blue"
      />
    </div>
  );
}