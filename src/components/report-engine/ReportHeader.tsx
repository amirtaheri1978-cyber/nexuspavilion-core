type ReportHeaderProps = {
  companyName: string;
  inverse?: boolean;
};

export function ReportHeader({
  companyName,
  inverse = false,
}: ReportHeaderProps) {
  return (
    <header
      className={`report-header ${inverse ? "report-header--inverse" : ""}`}
    >
      <div>
        <p className="report-header__brand">
          Nexus Pavilion
        </p>
        <p className="report-header__title">Executive Procurement Intelligence</p>
      </div>
      <div className="report-header__company">
        <span>Prepared for</span>
        <strong>{companyName}</strong>
      </div>
    </header>
  );
}
