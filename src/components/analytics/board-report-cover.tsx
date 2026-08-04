import Image from "next/image";

type BoardReportCoverProps = {
  companyName: string;
  generatedAt: string;
};

export function BoardReportCover({
  companyName,
  generatedAt,
}: BoardReportCoverProps) {
  return (
    <section
      aria-label="Executive board report cover"
      className="report-cover hidden print:flex print:min-h-[calc(100vh-24mm)] print:break-after-page print:flex-col print:overflow-hidden print:bg-[#061426] print:text-white"
    >
      <div className="relative flex min-h-[calc(100vh-24mm)] flex-col overflow-hidden border border-white/10 bg-[#061426] px-14 py-14">
        <div
          aria-hidden="true"
          className="absolute -right-32 -top-40 h-[480px] w-[480px] rounded-full bg-[#2CC4E8]/10 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="absolute -bottom-44 -left-32 h-[440px] w-[440px] rounded-full bg-[#C8A646]/10 blur-3xl"
        />

        <div className="relative z-10 flex items-start justify-between gap-8">
          <Image
            src="/branding/logo-horizontal-1024.png"
            alt="Nexus Pavilion"
            width={300}
            height={100}
            priority
            className="h-auto w-[270px] object-contain"
          />

          <span className="rounded-full border border-[#C8A646]/30 bg-[#C8A646]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#F5D77B]">
            Confidential
          </span>
        </div>

        <div className="relative z-10 mt-auto max-w-[760px]">
          <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#C8A646]">
            Executive Procurement Intelligence
          </p>

          <h1 className="mt-6 text-[62px] font-black leading-[0.98] tracking-[-0.055em] text-white">
            Board Report
          </h1>

          <p className="mt-6 max-w-2xl text-xl font-semibold leading-8 text-slate-300">
            Decision intelligence for procurement performance, supplier
            resilience, commercial opportunity, governance, and executive
            readiness.
          </p>

          <div className="mt-12 h-px w-full bg-gradient-to-r from-[#C8A646]/80 via-white/15 to-transparent" />

          <div className="mt-10 grid max-w-2xl grid-cols-2 gap-x-12 gap-y-8">
            <ReportDetail
              label="Prepared for"
              value={companyName}
            />

            <ReportDetail
              label="Generated"
              value={generatedAt}
            />

            <ReportDetail
              label="Report type"
              value="Executive Board Intelligence"
            />

            <ReportDetail
              label="Classification"
              value="Confidential — Controlled Distribution"
            />
          </div>
        </div>

        <div className="relative z-10 mt-16 border-t border-white/10 pt-7">
          <div className="flex items-end justify-between gap-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#C8A646]">
                Nexus Pavilion
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-400">
                Procurement Intelligence Platform
              </p>
            </div>

            <p className="max-w-md text-right text-xs font-semibold leading-6 text-slate-500">
              Procurement Intelligence · Executive Benchmarking · Decision
              Support · Board Governance
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-base font-black leading-6 text-white">
        {value}
      </p>
    </div>
  );
}
