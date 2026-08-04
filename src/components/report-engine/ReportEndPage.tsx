import Image from "next/image";

type ReportEndPageProps = {
  companyName: string;
  generatedAt: string;
};

export function ReportEndPage({ companyName, generatedAt }: ReportEndPageProps) {
  return (
    <section className="report-end-page" aria-label="End of executive board report">
      <div className="report-end-page__mark">
        <Image
          src="/branding/logo-horizontal-1024.png"
          alt="Nexus Pavilion"
          width={320}
          height={105}
          className="h-auto w-[250px] object-contain"
        />
      </div>

      <div className="report-end-page__content">
        <p className="report-kicker">End of report</p>
        <h2>Executive Procurement Intelligence</h2>
        <p>
          Prepared exclusively for {companyName}. This document contains
          confidential decision-support information and is intended for
          controlled executive distribution.
        </p>
      </div>

      <div className="report-end-page__meta">
        <span>Generated {generatedAt}</span>
        <span>Confidential · Nexus Pavilion</span>
      </div>
    </section>
  );
}
