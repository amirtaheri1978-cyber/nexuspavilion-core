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
return (
<ExecutivePanel variant="boardroom" padding="lg" tone="gold">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.25em] text-nexus-gold">
Board Presentation Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-nexus-white">
Executive Board Briefing
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
Board-ready procurement intelligence summarizing executive
performance, strategic risks, decision confidence, procurement
opportunities, and narrative-ready presentation slides.
</p>
</div>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
{boardPresentationMetrics.map((item) => (
<ExecutiveMetricCard
key={item.title}
label={item.title}
value={item.value}
tone="gold"
/>
))}
</div>

<div className="mt-8">
<ExecutiveInsightCard
title={boardPresentationReadiness}
insight={boardNarrative}
recommendation="Review the board narrative and validate priority slides before exporting the executive briefing package."
impact="Board presentation package is ready for executive review."
tone="gold"
/>
</div>

<div className="mt-8">
<p className="text-[10px] font-black uppercase tracking-[0.25em] text-nexus-gold">
Board Deck Generator
</p>

<h3 className="mt-3 text-2xl font-black text-nexus-white">
Executive Board Deck Outline
</h3>

<div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
{boardDeckSlides.map((slide) => (
<div
key={slide.slide}
className="rounded-executive border border-white/10 bg-white/5 p-6 shadow-inner-executive"
>
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-nexus-gold">
Slide {slide.slide}
</p>

<h4 className="mt-4 text-lg font-black text-nexus-white">
{slide.title}
</h4>

<p className="mt-4 text-sm font-black text-blue-200">
{slide.focus}
</p>

<p className="mt-4 text-sm font-semibold leading-7 text-nexus-muted">
{slide.narrative}
</p>
</div>
))}
</div>
</div>
</ExecutivePanel>
);
}
