import { ExecutivePanel } from "@/components/executive/executive-panel";
import { EXECUTIVE_PAGE_CLASS } from "@/lib/design-system/executive-contract";

export default function ProjectsLoading() {
  return (
    <main
      className={EXECUTIVE_PAGE_CLASS}
      aria-busy="true"
      aria-label="Loading Project Portfolio"
    >
      <p className="sr-only">Loading Project Portfolio</p>

      <ExecutivePanel variant="operational" padding="lg" tone="gold">
        <div className="motion-safe:animate-pulse">
          <div className="h-3 w-40 rounded-full bg-white/10" />
          <div className="mt-5 h-12 w-full max-w-xl rounded-2xl bg-white/10" />
          <div className="mt-5 h-4 w-full max-w-3xl rounded-full bg-white/[0.07]" />
        </div>
      </ExecutivePanel>

      <ExecutivePanel
        className="mt-8"
        variant="operational"
        padding="lg"
        tone="blue"
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-56 rounded-executive border border-white/10 bg-white/[0.035] motion-safe:animate-pulse"
            />
          ))}
        </div>
      </ExecutivePanel>
    </main>
  );
}
