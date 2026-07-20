import Link from "next/link";

import { ComplianceRow } from "@/components/vendor-intelligence/compliance-row";
import { DecisionMetric } from "@/components/vendor-intelligence/decision-metric";
import {
  daysUntil,
  formatStatus,
  getStatusClass,
} from "@/components/vendor-intelligence/vendor-display-utils";
import {
  getAwardedQuotes,
  getAwardedRevenue,
  getPerformanceRank,
  getPerformanceScore,
  getSupplierIntelligenceRank,
  getSupplierIntelligenceScore,
  getWinRate,
} from "@/lib/procurement/supplier-intelligence";

export type VendorWorkspaceCompliance = {
  id: string;
  vendor_company_id: string | null;
  insurance_status: string | null;
  insurance_expiry: string | null;
  certificate_status: string | null;
  certificate_expiry: string | null;
  license_status: string | null;
  license_expiry: string | null;
  tax_status: string | null;
  compliance_score: number | null;
  overall_status: string | null;
};

export type VendorWorkspaceQuote = {
  id: string;
  rfq_id: string | null;
  company_id: string | null;
  amount: number | string | null;
  decision: string | null;
  created_at: string | null;
  awarded_at: string | null;
};

export type VendorWorkspaceApprovedVendor = {
  id: string;
  buyer_company_id: string | null;
  vendor_company_id: string;
  status: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
  approved_at: string | null;
  vendor?: {
    id: string;
    name: string | null;
    slug: string | null;
    category: string | null;
    location: string | null;
    network_role: string | null;
    status: string | null;
    logo_url?: string | null;
  } | null;
};

type VendorDecisionWorkspaceProps = {
  approvedVendor: VendorWorkspaceApprovedVendor;
  compliance: VendorWorkspaceCompliance | null;
  vendorQuotes: VendorWorkspaceQuote[];
};

export function VendorDecisionWorkspace({
  approvedVendor,
  compliance,
  vendorQuotes,
}: VendorDecisionWorkspaceProps) {
  const vendor = approvedVendor.vendor;
  const awardedVendorQuotes = getAwardedQuotes(vendorQuotes);

  const supplierIntelligenceScore = getSupplierIntelligenceScore({
    compliance,
    quotes: vendorQuotes,
  });

  const supplierIntelligenceRank = getSupplierIntelligenceRank(
    supplierIntelligenceScore
  );

  const vendorWinRate = getWinRate(vendorQuotes);
  const awardedRevenue = getAwardedRevenue(vendorQuotes);
  const performanceScore = getPerformanceScore(vendorQuotes);
  const performanceRank = getPerformanceRank(performanceScore);
  const complianceScore = Number(compliance?.compliance_score || 0);
  const riskLevel = getVendorRiskLevel(compliance);
  const eligibilityStatus =
    compliance?.overall_status === "valid" ? "Eligible" : "Review Required";
  const recommendedAction = getVendorRecommendedAction(compliance);

  return (
    <article className="p-5 transition-colors hover:bg-white/[0.02] sm:p-6 lg:p-8">
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/15">
        <div className="grid gap-6 border-b border-white/10 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getStatusClass(
                  approvedVendor.status
                )}`}
              >
                {formatStatus(approvedVendor.status)}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getStatusClass(
                  compliance?.overall_status
                )}`}
              >
                {formatStatus(compliance?.overall_status)}
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                {riskLevel} Risk
              </span>
            </div>

            <h3 className="mt-4 text-2xl font-black tracking-[-0.03em] text-white">
              {vendor?.name || "Unnamed Vendor"}
            </h3>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
              {vendor?.category || "Supplier"} ·{" "}
              {vendor?.location || "Location N/A"} ·{" "}
              {vendor?.network_role || "Network role pending"}
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 lg:text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                RFQ Eligibility
              </p>

              <p
                className={`mt-1 text-sm font-black ${
                  eligibilityStatus === "Eligible"
                    ? "text-emerald-300"
                    : "text-orange-300"
                }`}
              >
                {eligibilityStatus}
              </p>
            </div>

            {vendor?.slug ? (
              <Link
                href={`/company/${vendor.slug}`}
                className="inline-flex rounded-full border border-white/15 bg-white px-5 py-3 text-xs font-black text-slate-950 transition hover:bg-slate-200"
              >
                Open Vendor Profile
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="border-b border-white/10 p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-400">
              Compliance Evidence
            </p>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
              <ComplianceRow
                title="Insurance"
                status={compliance?.insurance_status}
                expiry={compliance?.insurance_expiry}
              />
              <ComplianceRow
                title="Certificate"
                status={compliance?.certificate_status}
                expiry={compliance?.certificate_expiry}
              />
              <ComplianceRow
                title="License"
                status={compliance?.license_status}
                expiry={compliance?.license_expiry}
              />
              <ComplianceRow
                title="Tax"
                status={compliance?.tax_status}
                expiry={null}
              />
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-400">
              Decision Intelligence
            </p>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <DecisionMetric
                label="Compliance"
                value={complianceScore > 0 ? `${complianceScore}` : "—"}
                detail={complianceScore > 0 ? "of 100" : "Setup"}
              />
              <DecisionMetric
                label="Intelligence"
                value={String(supplierIntelligenceScore)}
                detail={supplierIntelligenceRank}
              />
              <DecisionMetric
                label="Performance"
                value={String(performanceScore)}
                detail={performanceRank}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-xs font-black text-slate-300">
              <span>{vendorQuotes.length} Quotes</span>
              <span className="text-slate-600" aria-hidden="true">
                •
              </span>
              <span>{awardedVendorQuotes.length} Awards</span>
              <span className="text-slate-600" aria-hidden="true">
                •
              </span>
              <span>{vendorWinRate}% Win Rate</span>
              <span className="text-slate-600" aria-hidden="true">
                •
              </span>
              <span>{formatMoney(awardedRevenue)} Awarded</span>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Recommended Action
                  </p>
                  <p className="mt-2 text-sm font-black leading-6 text-white">
                    {recommendedAction.title}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                    {recommendedAction.detail}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${
                    recommendedAction.tone === "critical"
                      ? "border-red-400/20 bg-red-400/10 text-red-300"
                      : recommendedAction.tone === "attention"
                        ? "border-orange-400/20 bg-orange-400/10 text-orange-300"
                        : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  }`}
                >
                  {recommendedAction.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "$0";

  return `$${amount.toLocaleString()}`;
}

function getVendorRiskLevel(compliance: VendorWorkspaceCompliance | null) {
  const score = Number(compliance?.compliance_score || 0);

  if (!compliance || score === 0) return "Critical";
  if (score >= 85) return "Low";
  if (score >= 60) return "Medium";

  return "High";
}

function getVendorRecommendedAction(
  compliance: VendorWorkspaceCompliance | null
) {
  if (!compliance) {
    return {
      title: "Complete supplier compliance setup",
      detail:
        "Create the required compliance record before treating this supplier as RFQ-ready.",
      label: "Setup Required",
      tone: "critical" as const,
    };
  }

  const expiries = [
    { title: "Insurance", value: compliance.insurance_expiry },
    { title: "Certificate", value: compliance.certificate_expiry },
    { title: "License", value: compliance.license_expiry },
  ];

  const expiredDocument = expiries.find(({ value }) => {
    const days = daysUntil(value);

    return days !== null && days < 0;
  });

  if (expiredDocument) {
    return {
      title: `Renew expired ${expiredDocument.title.toLowerCase()} evidence`,
      detail:
        "Restore current eligibility documentation before further sourcing or award activity.",
      label: "Immediate Action",
      tone: "critical" as const,
    };
  }

  const criticalDocument = expiries.find(({ value }) => {
    const days = daysUntil(value);

    return days !== null && days <= 30;
  });

  if (criticalDocument) {
    return {
      title: `Coordinate ${criticalDocument.title.toLowerCase()} renewal`,
      detail:
        "Complete renewal within the current 30-day exposure window to protect RFQ eligibility.",
      label: "Renewal Due",
      tone: "attention" as const,
    };
  }

  if (compliance.overall_status !== "valid") {
    return {
      title: "Review supplier eligibility evidence",
      detail:
        "Resolve incomplete or non-current compliance conditions before unrestricted RFQ participation.",
      label: "Review Required",
      tone: "attention" as const,
    };
  }

  return {
    title: "Continue standard supplier monitoring",
    detail:
      "No immediate compliance intervention is required for current procurement participation.",
    label: "Controls Current",
    tone: "current" as const,
  };
}