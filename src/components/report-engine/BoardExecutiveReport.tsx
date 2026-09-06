import { ReportFooter } from "./ReportFooter";
import { ReportHeader } from "./ReportHeader";
import { ReportSectionDivider } from "./ReportSectionDivider";

type Metric = {
  label: string;
  value: string;
  context?: string;
  tone?: "gold" | "blue" | "green" | "red";
};

type BoardExecutiveReportProps = {
  companyName: string;
  generatedAt: string;
  decisionStatement: string;
  recommendation: string;
  boardPriority: string;
  enterpriseScore: number;
  boardReadiness: number;
  decisionReadiness: number;
  riskIndex: number;
  opportunityValue: string;
  procurementVolume: string;
  awardedVolume: string;
  awardRate: string;
  supplierCount: number;
  supplierEngagement: number;
  supplierDiversification: number;
  portfolioHealth: number;
  forecastConfidence: string;
  forecastNarrative: string;
  benchmarkPosition: string;
  benchmarkScore: number;
  findings: string[];
  risks: string[];
  opportunities: string[];
  actions: string[];
};

export function BoardExecutiveReport(props: BoardExecutiveReportProps) {
  const riskLevel =
    props.riskIndex >= 70
      ? "High"
      : props.riskIndex >= 40
        ? "Moderate"
        : "Low";

  return (
    <div className="board-executive-report">
      <ReportSectionDivider
        number={1}
        title="Board Decision Brief"
        description="The decisions, exposure, and value-creation priorities requiring board attention."
        companyName={props.companyName}
        generatedAt={props.generatedAt}
      />

      <ReportPage
        companyName={props.companyName}
        generatedAt={props.generatedAt}
        eyebrow="Decision brief"
        title="What requires leadership attention now"
        lead={props.decisionStatement}
      >
        <div className="board-callout board-callout--gold">
          <span>Recommended direction</span>
          <h3>{props.recommendation}</h3>
        </div>

        <div className="board-two-column">
          <BoardList title="Material findings" items={props.findings} />
          <BoardList title="Priority actions" items={props.actions} numbered />
        </div>

        <div className="board-decision-strip">
          <span>Board priority</span>
          <strong>{props.boardPriority}</strong>
        </div>
      </ReportPage>

      <ReportPage
        companyName={props.companyName}
        generatedAt={props.generatedAt}
        eyebrow="Enterprise scorecard"
        title="Procurement control and decision readiness"
        lead="A concise view of enterprise health, governance readiness, decision readiness, and current risk exposure."
      >
        <MetricGrid
          metrics={[
            {
              label: "Enterprise health",
              value: `${props.enterpriseScore}/100`,
              context: "Consolidated procurement performance",
              tone: "gold",
            },
            {
              label: "Board readiness",
              value: `${props.boardReadiness}/100`,
              context: "Governance and evidence readiness",
              tone: "blue",
            },
            {
              label: "Decision readiness",
              value: `${props.decisionReadiness}/100`,
              context: "Evidence readiness for executive action",
              tone: "green",
            },
            {
              label: "Risk exposure",
              value: `${props.riskIndex}/100`,
              context: `${riskLevel} current exposure`,
              tone: "red",
            },
          ]}
        />

        <ScoreNarrative
          title="Board interpretation"
          body={props.decisionStatement}
          label={riskLevel}
        />

        <BoardList title="Evidence constraints" items={props.risks} />
      </ReportPage>

      <ReportSectionDivider
        number={2}
        title="Commercial Opportunity"
        description="Value capture, commercial leverage, and the portfolio actions with the strongest executive impact."
        companyName={props.companyName}
        generatedAt={props.generatedAt}
        tone="light"
      />

      <ReportPage
        companyName={props.companyName}
        generatedAt={props.generatedAt}
        eyebrow="Commercial intelligence"
        title="Value capture and procurement leverage"
        lead="Commercial opportunity is framed against current portfolio scale, awarded value, and procurement conversion."
      >
        <MetricGrid
          metrics={[
            {
              label: "Identified opportunity",
              value: props.opportunityValue,
              context: "Potential savings opportunity",
              tone: "gold",
            },
            {
              label: "Procurement volume",
              value: props.procurementVolume,
              context: "Current portfolio value",
              tone: "blue",
            },
            {
              label: "Awarded volume",
              value: props.awardedVolume,
              context: "Value progressed to award",
              tone: "green",
            },
            {
              label: "Award rate",
              value: props.awardRate,
              context: "Portfolio conversion",
              tone: "blue",
            },
          ]}
        />

        <BoardList
          title="Highest-value opportunity paths"
          items={props.opportunities}
          numbered
        />

        <div className="board-callout board-callout--navy">
          <span>Executive recommendation</span>
          <h3>{props.recommendation}</h3>
        </div>
      </ReportPage>

      <ReportSectionDivider
        number={3}
        title="Risk & Resilience"
        description="The material supplier, concentration, data, and execution risks affecting enterprise readiness."
        companyName={props.companyName}
        generatedAt={props.generatedAt}
      />

      <ReportPage
        companyName={props.companyName}
        generatedAt={props.generatedAt}
        eyebrow="Enterprise risk"
        title="Exposure requiring active governance"
        lead="Risk is presented as a decision constraint: what may affect commercial outcomes, continuity, or confidence in the evidence base."
      >
        <div className="board-risk-hero">
          <div>
            <span>Risk index</span>
            <strong>{props.riskIndex}/100</strong>
          </div>
          <div>
            <span>Current posture</span>
            <strong>{riskLevel}</strong>
          </div>
        </div>

        <BoardList title="Material risk register" items={props.risks} numbered />

        <div className="board-decision-strip">
          <span>Required response</span>
          <strong>{props.actions[0] ?? props.recommendation}</strong>
        </div>
      </ReportPage>

      <ReportPage
        companyName={props.companyName}
        generatedAt={props.generatedAt}
        eyebrow="Supplier resilience"
        title="Network depth and portfolio health"
        lead="Supplier capacity, engagement, and diversification determine whether opportunity can be converted without increasing concentration exposure."
      >
        <MetricGrid
          metrics={[
            {
              label: "Supplier network",
              value: String(props.supplierCount),
              context: "Ranked suppliers in the portfolio",
              tone: "blue",
            },
            {
              label: "Supplier engagement",
              value: `${props.supplierEngagement}/100`,
              context: "Participation and response strength",
              tone: "green",
            },
            {
              label: "Diversification",
              value: `${props.supplierDiversification}/100`,
              context: "Protection from concentration",
              tone: "gold",
            },
            {
              label: "Portfolio health",
              value: `${props.portfolioHealth}/100`,
              context: "Combined supplier resilience",
              tone: "blue",
            },
          ]}
        />

        <div className="board-two-column">
          <BoardList title="Portfolio findings" items={props.findings} />
          <BoardList title="Management response" items={props.actions} />
        </div>
      </ReportPage>

      <ReportSectionDivider
        number={4}
        title="Historical Patterns & Governance"
        description="Observed procurement movement, internal performance position, governance readiness, and the executive agenda."
        companyName={props.companyName}
        generatedAt={props.generatedAt}
        tone="light"
      />

      <ReportPage
        companyName={props.companyName}
        generatedAt={props.generatedAt}
        eyebrow="Historical pattern evidence"
        title="Observed procurement movement and strategic posture"
        lead={props.forecastNarrative}
      >
        <div className="board-two-column board-two-column--hero">
          <ScoreNarrative
            title="Decision evidence readiness"
            body="Current and preceding 30-day windows are compared using persisted RFQ and quotation timestamps. This is descriptive historical evidence, not a forecast."
            label={props.forecastConfidence}
          />
          <ScoreNarrative
            title="Internal performance position"
            body="This position is derived from current validated procurement evidence and is not an external peer or industry benchmark."
            label={props.benchmarkPosition}
          />
        </div>

        <MetricGrid
          metrics={[
            {
              label: "Internal benchmark readiness",
              value: `${props.benchmarkScore}/100`,
              context: "Internal evidence and readiness measure",
              tone: "gold",
            },
            {
              label: "Board readiness",
              value: `${props.boardReadiness}/100`,
              context: "Current governance posture",
              tone: "green",
            },
          ]}
          compact
        />

        <div className="board-callout board-callout--navy">
          <span>Board priority</span>
          <h3>{props.boardPriority}</h3>
        </div>
      </ReportPage>

      <ReportPage
        companyName={props.companyName}
        generatedAt={props.generatedAt}
        eyebrow="90-day agenda"
        title="Decisions and accountable next actions"
        lead="A focused execution agenda translating portfolio intelligence into governed management action."
      >
        <BoardList title="Executive action plan" items={props.actions} numbered />

        <div className="board-two-column">
          <ScoreNarrative
            title="Success measure"
            body="Stronger supplier participation, improved evidence quality, and measurable conversion of identified opportunity."
            label="90 days"
          />
          <ScoreNarrative
            title="Governance cadence"
            body="Monthly management review with quarterly board escalation for material risk, evidence-readiness, or value-capture variance."
            label="Monthly"
          />
        </div>

        <div className="board-decision-strip">
          <span>Executive owner</span>
          <strong>Procurement leadership with finance and risk oversight</strong>
        </div>
      </ReportPage>

      <ReportPage
        companyName={props.companyName}
        generatedAt={props.generatedAt}
        eyebrow="Appendix"
        title="Methodology and decision-use statement"
        lead="This report consolidates validated procurement activity, supplier participation, award outcomes, portfolio classification, internal performance signals, and rule-based executive interpretation."
      >
        <div className="board-methodology">
          <MethodologyItem
            number="01"
            title="Evidence"
            body="Operational RFQ, quote, supplier, award, and classification data available to the current organization workspace."
          />
          <MethodologyItem
            number="02"
            title="Interpretation"
            body="Rule-based scoring converts source evidence into health, risk, readiness, opportunity, and internal performance signals."
          />
          <MethodologyItem
            number="03"
            title="Decision use"
            body="Outputs support executive judgment. They do not replace financial validation, supplier due diligence, contractual review, or delegated authority."
          />
          <MethodologyItem
            number="04"
            title="Governance"
            body="Material decisions should be documented with accountable owners, evidence references, approval status, and follow-up review dates."
          />
        </div>

        <div className="board-callout board-callout--gold">
          <span>Classification</span>
          <h3>Confidential - controlled executive distribution</h3>
        </div>
      </ReportPage>
    </div>
  );
}

function ReportPage({
  companyName,
  generatedAt,
  eyebrow,
  title,
  lead,
  children,
}: {
  companyName: string;
  generatedAt: string;
  eyebrow: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section className="report-page board-report-page">
      <ReportHeader companyName={companyName} />
      <div className="report-page__body">
        <p className="report-kicker">{eyebrow}</p>
        <h2 className="report-page__title">{title}</h2>
        <p className="report-page__lead">{lead}</p>
        <div className="board-report-page__content">{children}</div>
      </div>
      <ReportFooter generatedAt={generatedAt} />
    </section>
  );
}

function MetricGrid({
  metrics,
  compact = false,
}: {
  metrics: Metric[];
  compact?: boolean;
}) {
  return (
    <div
      className={`board-metric-grid ${compact ? "board-metric-grid--compact" : ""}`}
    >
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={`board-metric board-metric--${metric.tone ?? "blue"}`}
        >
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          {metric.context ? <p>{metric.context}</p> : null}
        </div>
      ))}
    </div>
  );
}

function BoardList({
  title,
  items,
  numbered = false,
}: {
  title: string;
  items: string[];
  numbered?: boolean;
}) {
  const visibleItems = items.filter(Boolean).slice(0, 4);

  return (
    <div className="board-list">
      <h3>{title}</h3>
      <div>
        {visibleItems.map((item, index) => (
          <article key={`${index}-${item}`}>
            <span>{numbered ? String(index + 1).padStart(2, "0") : ""}</span>
            <p>{item}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ScoreNarrative({
  title,
  body,
  label,
}: {
  title: string;
  body: string;
  label: string;
}) {
  return (
    <div className="board-score-narrative">
      <span>{title}</span>
      <strong>{label}</strong>
      <p>{body}</p>
    </div>
  );
}

function MethodologyItem({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <article>
      <span>{number}</span>
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </article>
  );
}
