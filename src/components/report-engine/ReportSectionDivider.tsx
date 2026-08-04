import { ReportFooter } from "./ReportFooter";
import { ReportHeader } from "./ReportHeader";

type ReportSectionDividerProps = {
  number: number;
  title: string;
  description: string;
  companyName: string;
  generatedAt: string;
  tone?: "navy" | "light";
};

export function ReportSectionDivider({
  number,
  title,
  description,
  companyName,
  generatedAt,
  tone = "navy",
}: ReportSectionDividerProps) {
  const dark = tone === "navy";

  return (
    <section
      aria-label={`Section ${number}: ${title}`}
      className={`report-section-divider ${dark ? "report-section-divider--navy" : "report-section-divider--light"}`}
    >
      <ReportHeader companyName={companyName} inverse={dark} />

      <div className="report-section-divider__content">
        <p className="report-kicker">Section {String(number).padStart(2, "0")}</p>
        <h2>{title}</h2>
        <div className="report-gold-rule" />
        <p className="report-section-divider__description">{description}</p>
      </div>

      <ReportFooter generatedAt={generatedAt} inverse={dark} />
    </section>
  );
}
