type ReportFooterProps = {
  generatedAt: string;
  inverse?: boolean;
};

export function ReportFooter({
  generatedAt,
  inverse = false,
}: ReportFooterProps) {
  return (
    <footer
      className={`report-footer ${inverse ? "report-footer--inverse" : ""}`}
    >
      <span>Confidential · Generated {generatedAt}</span>
      <span className="report-footer__folio">Nexus Pavilion · Executive Report</span>
    </footer>
  );
}
