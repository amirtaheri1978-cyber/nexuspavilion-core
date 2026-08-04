import { ReportFooter } from "./ReportFooter";
import { ReportHeader } from "./ReportHeader";

type TableOfContentsProps = {
  companyName: string;
  generatedAt: string;
};

export function TableOfContents({
  companyName,
  generatedAt,
}: TableOfContentsProps) {
  const sections = [
    ["Executive Summary", "Mandate, signals, risks, and recommended actions"],
    ["Executive Overview", "Enterprise health and boardroom snapshot"],
    ["Decision Intelligence", "Commercial opportunity and decision readiness"],
    ["Portfolio Intelligence", "Procurement structure and supplier resilience"],
    ["Board & Governance", "Forecast, benchmark, risk, and readiness"],
    ["Appendix", "Supporting intelligence and methodology"],
  ];

  return (
    <section className="report-page report-table-of-contents">
      <ReportHeader companyName={companyName} />
      <div className="report-page__body">
        <p className="report-kicker">Contents</p>
        <h2 className="report-page__title">Report architecture</h2>
        <p className="report-page__lead">
          A decision-first view of performance, exposure, opportunity, and
          governance across the procurement portfolio.
        </p>

        <div className="report-toc-list">
          {sections.map(([section, description], index) => (
            <div key={section} className="report-toc-item">
              <span className="report-toc-item__number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <strong>{section}</strong>
                <p>{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ReportFooter generatedAt={generatedAt} />
    </section>
  );
}
