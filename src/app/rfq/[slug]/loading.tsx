import { ExecutivePanel } from "@/components/executive/executive-panel";
import { EXECUTIVE_PAGE_CLASS } from "@/lib/design-system/executive-contract";

export default function RfqDetailLoading() {
  return (
    <div className="min-h-full bg-nexus-navy text-white">
      <div className={EXECUTIVE_PAGE_CLASS} aria-busy="true" aria-live="polite">
        <p className="sr-only">Loading RFQ workspace</p>
        <ExecutivePanel variant="executive" padding="lg" tone="gold">
          <div className="h-3 w-40 rounded-full bg-white/10" />
          <div className="mt-5 h-10 max-w-xl rounded-2xl bg-white/10" />
        </ExecutivePanel>
      </div>
    </div>
  );
}
