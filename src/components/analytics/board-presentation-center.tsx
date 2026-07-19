import { ExecutiveInsightCard } from "@/components/executive/executive-insight-card";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type BoardPresentationMetric = {
  title: string;
  value: string;
};

type BoardDeckSlide = {
  slide: string;
  title: string;
  focus: string;
  narrative: string;
};

type BoardPresentationCenterProps = {
  boardPresentationMetrics: BoardPresentationMetric[];
  boardPresentationReadiness: string;
  boardNarrative: string;
  boardDeckSlides: BoardDeckSlide[];
};

export function BoardPresentationCenter({
  boardPresentationMetrics,
  boardPresentationReadiness,
  boardNarrative,
  boardDeckSlides,
}: BoardPresentationCenterProps) {
  const hasMetrics = boardPresentationMetrics.length > 0;
  const hasSlides = boardDeckSlides.length > 0;
  const isPresentationAvailable = hasMetrics || hasSlides;

  return (
    <ExecutivePanel
      aria-labelledby="board-presentation-center-heading"
      variant="boardroom"
      padding="lg"
      tone="gold"
    >
      <header className="grid min-w-0 gap-6 border-b border-white/10 pb-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-nexus-gold sm:text-xs">
              Board Presentation Intelligence
            </p>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Executive communication assurance
            </p>
          </div>

          <h2
            id="board-presentation-center-heading"
            className="mt-4 max-w-5xl text-3xl font-black leading-[1.08] tracking-tight text-nexus-white sm:text-4xl lg:text-5xl"
          >
            Executive Board Briefing
          </h2>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted sm:text-base">
            Board-ready procurement intelligence consolidating executive
            performance, strategic risk, decision confidence, procurement
            opportunity, and presentation-ready leadership narratives.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:flex-col xl:items-end">
          <StatusBadge active={isPresentationAvailable} />

          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
            {boardDeckSlides.length} briefing slides
          </p>
        </div>
      </header>

      <section
        aria-labelledby="presentation-readiness-heading"
        className="mt-7 overflow-hidden rounded-3xl border border-nexus-gold/20 bg-nexus-gold/[0.045]"
      >
        <div className="grid min-w-0 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="border-b border-white/10 p-5 sm:p-6 xl:border-b-0 xl:border-r">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Presentation readiness
            </p>

            <h3
              id="presentation-readiness-heading"
              className="mt-3 break-words text-xl font-black tracking-tight text-nexus-white sm:text-2xl"
            >
              {boardPresentationReadiness}
            </h3>

            <p className="mt-3 text-xs font-semibold leading-6 text-nexus-muted">
              Current readiness position of the executive briefing package for
              board-level review.
            </p>

            <div className="mt-6 grid gap-3">
              <PresentationSignal
                label="Evidence Metrics"
                value={`${boardPresentationMetrics.length} available`}
              />

              <PresentationSignal
                label="Briefing Slides"
                value={`${boardDeckSlides.length} prepared`}
              />
            </div>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Executive presentation narrative
            </p>

            <p className="mt-4 break-words text-lg font-bold leading-8 text-nexus-white [overflow-wrap:anywhere] sm:text-xl sm:leading-9">
              {boardNarrative}
            </p>

            <div className="mt-6 border-t border-white/10 pt-5">
              <ExecutiveInsightCard
                title={boardPresentationReadiness}
                insight={boardNarrative}
                recommendation="Review the board narrative and validate priority slides before exporting the executive briefing package."
                impact="Board presentation package is ready for executive review."
                tone="gold"
              />
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="presentation-evidence-heading"
        className="mt-7 min-w-0"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Board evidence layer
            </p>

            <h3
              id="presentation-evidence-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Presentation Evidence Metrics
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Validated executive indicators supporting the narrative and
            decision position presented to the board.
          </p>
        </div>

        {hasMetrics ? (
          <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {boardPresentationMetrics.map((item) => (
              <ExecutiveMetricCard
                key={item.title}
                label={item.title}
                value={item.value}
                tone="gold"
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No presentation metrics available"
            description="Board presentation evidence metrics are currently unavailable."
          />
        )}
      </section>

      <section
        aria-labelledby="board-deck-outline-heading"
        className="mt-7 min-w-0"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Board briefing structure
            </p>

            <h3
              id="board-deck-outline-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Executive Board Deck Outline
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Slide sequence preserving the exact briefing structure supplied by
            the board presentation intelligence model.
          </p>
        </div>

        {hasSlides ? (
          <div className="mt-5 grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {boardDeckSlides.map((slide, index) => (
              <BoardDeckSlideCard
                key={slide.slide}
                slide={slide}
                position={index + 1}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No board slides available"
            description="The executive board deck outline has not yet been prepared."
          />
        )}
      </section>
    </ExecutivePanel>
  );
}

function BoardDeckSlideCard({
  slide,
  position,
}: {
  slide: BoardDeckSlide;
  position: number;
}) {
  return (
    <article className="flex min-w-0 flex-col rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-inner-executive sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-nexus-gold/20 bg-nexus-gold/[0.07] text-[10px] font-black text-nexus-gold">
            {String(position).padStart(2, "0")}
          </span>

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
              Briefing sequence
            </p>

            <p className="mt-1 break-words text-[10px] font-black uppercase tracking-[0.17em] text-nexus-gold">
              Slide {slide.slide}
            </p>
          </div>
        </div>

        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-nexus-muted">
          Board Review
        </span>
      </div>

      <h4 className="mt-5 break-words text-xl font-black leading-7 text-nexus-white [overflow-wrap:anywhere]">
        {slide.title}
      </h4>

      <div className="mt-4 rounded-2xl border border-blue-300/10 bg-blue-300/[0.045] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-200">
          Strategic Focus
        </p>

        <p className="mt-2 break-words text-sm font-black leading-6 text-blue-100 [overflow-wrap:anywhere]">
          {slide.focus}
        </p>
      </div>

      <div className="mt-4 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
          Board Narrative
        </p>

        <p className="mt-2 break-words text-sm font-semibold leading-7 text-nexus-muted [overflow-wrap:anywhere]">
          {slide.narrative}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-muted">
          Presentation ready
        </p>

        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-gold">
          Executive evidence
        </p>
      </div>
    </article>
  );
}

function PresentationSignal({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-nexus-muted">
        {label}
      </p>

      <p className="shrink-0 text-sm font-black text-nexus-white">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${
        active
          ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
          : "border-orange-300/20 bg-orange-400/10 text-orange-300"
      }`}
    >
      {active ? "Available" : "Insufficient Data"}
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