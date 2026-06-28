import { BoardAutomationCenter } from "@/components/analytics/board-automation-center";
import { BoardPresentationCenter } from "@/components/analytics/board-presentation-center";
import BoardReadinessIntelligence from "@/components/analytics/board/board-readiness-intelligence";
import { BoardRiskPrioritization } from "@/components/analytics/board-risk-prioritization";

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

type BoardRiskPriority = {
title: string;
priority: string;
impact: string;
attention: string;
summary: string;
};

type BoardAutomationItem = {
title: string;
status: string;
};

type BoardPackageStage = {
stage: string;
status: string;
};

type BoardDistributionChannel = {
channel: string;
status: string;
};

type BoardApprovalStage = {
stage: string;
status: string;
};

type BoardDashboardProps = {
boardReadinessScore: number;
governanceReadiness: string;
financialVisibility: string;
riskVisibility: string;
boardRecommendation: string;

boardRiskPriorities: BoardRiskPriority[];

boardPresentationMetrics: BoardPresentationMetric[];
boardPresentationReadiness: string;
boardNarrative: string;
boardDeckSlides: BoardDeckSlide[];

boardAutomationItems: BoardAutomationItem[];
boardAutomationStatus: string;
boardPackageLifecycle: string;
boardPackageStages: BoardPackageStage[];
boardDistributionChannels: BoardDistributionChannel[];
boardDistributionReadiness: string;
boardApprovalStages: BoardApprovalStage[];
boardApprovalStatus: string;
};

export function BoardDashboard({
boardReadinessScore,
governanceReadiness,
financialVisibility,
riskVisibility,
boardRecommendation,
boardRiskPriorities,
boardPresentationMetrics,
boardPresentationReadiness,
boardNarrative,
boardDeckSlides,
boardAutomationItems,
boardAutomationStatus,
boardPackageLifecycle,
boardPackageStages,
boardDistributionChannels,
boardDistributionReadiness,
boardApprovalStages,
boardApprovalStatus,
}: BoardDashboardProps) {
return (
<>
<BoardReadinessIntelligence
boardReadinessScore={boardReadinessScore}
governanceReadiness={governanceReadiness}
financialVisibility={financialVisibility}
riskVisibility={riskVisibility}
boardRecommendation={boardRecommendation}
/>

<BoardRiskPrioritization boardRiskPriorities={boardRiskPriorities} />

<BoardPresentationCenter
boardPresentationMetrics={boardPresentationMetrics}
boardPresentationReadiness={boardPresentationReadiness}
boardNarrative={boardNarrative}
boardDeckSlides={boardDeckSlides}
/>

<BoardAutomationCenter
boardAutomationItems={boardAutomationItems}
boardAutomationStatus={boardAutomationStatus}
boardPackageLifecycle={boardPackageLifecycle}
boardPackageStages={boardPackageStages}
boardDistributionChannels={boardDistributionChannels}
boardDistributionReadiness={boardDistributionReadiness}
boardApprovalStages={boardApprovalStages}
boardApprovalStatus={boardApprovalStatus}
/>
</>
);
}
