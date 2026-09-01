import { BoardReportCover } from "../analytics/board-report-cover";
import { TableOfContents } from "./TableOfContents";
import { ExecutiveSummary } from "./ExecutiveSummary";

type BoardReportProps = {
  companyName: string;
  generatedAt: string;

  procurementHealth: number;
  opportunityValue: string;
  riskLevel: string;
  confidence: string;

  findings: string[];
  risks: string[];
  actions: string[];

  recommendation: string;

  children?: React.ReactNode;
};

export function BoardReport({
  companyName,
  generatedAt,
  procurementHealth,
  opportunityValue,
  riskLevel,
  confidence,
  findings,
  risks,
  actions,
  recommendation,
  children,
}: BoardReportProps) {
  return (
    <main className="bg-white">
      <BoardReportCover
        companyName={companyName}
        generatedAt={generatedAt}
      />

      <TableOfContents companyName={companyName} generatedAt={generatedAt} />

      <ExecutiveSummary
        companyName={companyName}
        generatedAt={generatedAt}
        procurementHealth={procurementHealth}
        opportunityValue={opportunityValue}
        riskLevel={riskLevel}
        decisionSupportReadiness={confidence}
        findings={findings}
        risks={risks}
        actions={actions}
        recommendation={recommendation}
      />

      {children}
    </main>
  );
}
