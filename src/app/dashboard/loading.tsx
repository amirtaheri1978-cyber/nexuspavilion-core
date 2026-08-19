import { ExecutivePanel } from "@/components/executive/executive-panel";
import { EXECUTIVE_PAGE_CLASS } from "@/lib/design-system/executive-contract";

export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-nexus-navy text-white">
      <div className={EXECUTIVE_PAGE_CLASS} aria-busy="true" aria-live="polite">
        <p className="sr-only">Loading executive dashboard</p>
        <ExecutivePanel variant="executive" padding="lg" tone="gold">
          <div className="h-3 w-40 rounded-full bg-white/10" />
          <div className="mt-5 h-10 max-w-xl rounded-2xl bg-white/10" />
          <div className="mt-4 h-16 max-w-3xl rounded-2xl bg-white/[0.06]" />
        </ExecutivePanel>
        <ExecutivePanel variant="operational" padding="lg" className="np-region">
          <div className="h-3 w-28 rounded-full bg-white/10" />
          <div className="mt-4 h-24 rounded-executive bg-white/[0.06]" />
        </ExecutivePanel>
        <div className="np-region grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {["kpi-a", "kpi-b", "kpi-c", "kpi-d"].map((id) => (
            <ExecutivePanel key={id} variant="operational" padding="sm" radius="tile">
              <div className="h-3 w-24 rounded-full bg-white/10" />
              <div className="mt-4 h-8 w-20 rounded-xl bg-white/[0.08]" />
            </ExecutivePanel>
          ))}
        </div>
      </div>
    </main>
  );
}
