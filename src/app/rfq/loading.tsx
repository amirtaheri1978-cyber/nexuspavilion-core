import { ExecutivePanel } from "@/components/executive/executive-panel";
import { EXECUTIVE_PAGE_CLASS } from "@/lib/design-system/executive-contract";

export default function RfqLoading() {
  return (
    <main className="min-h-screen bg-nexus-navy text-white">
      <div className={EXECUTIVE_PAGE_CLASS} aria-busy="true" aria-live="polite">
        <p className="sr-only">Loading procurement opportunity</p>
        <ExecutivePanel variant="executive" padding="lg" tone="gold">
          <div className="h-3 w-40 rounded-full bg-white/10" />
          <div className="mt-5 h-10 max-w-xl rounded-2xl bg-white/10" />
          <div className="mt-4 h-16 max-w-3xl rounded-2xl bg-white/[0.06]" />
        </ExecutivePanel>
        <ExecutivePanel variant="operational" padding="lg" className="np-region">
          <div className="h-3 w-28 rounded-full bg-white/10" />
          <div className="mt-4 h-24 rounded-executive bg-white/[0.06]" />
        </ExecutivePanel>
      </div>
    </main>
  );
}
