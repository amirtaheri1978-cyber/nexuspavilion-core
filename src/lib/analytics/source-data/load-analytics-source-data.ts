import {
  getActiveMembershipForUserCompany,
  type OrganizationMembership,
} from "@/lib/auth/membership";
import {
  createEmptyGroupedCompliance,
  loadCompanyCompliance,
  type GroupedCompanyCompliance,
} from "@/lib/company/compliance";
import { createClient } from "@/lib/supabase/server";
import type { AnalyticsRFQ } from "@/lib/analytics/procurement-utils";
import { isRfqCommercialOpeningUnlocked } from "@/lib/procurement/rfq-commercial-intelligence";

export type AnalyticsQuote = {
  id: string;
  rfq_id: string;
  company_id: string | null;
  amount: number | string | null;
  decision: string | null;
  created_at?: string | null;
};

export type AnalyticsCompany = {
  id: string;
  name: string | null;
};

export type AnalyticsCommercialAccess = {
  canViewIssuerCommercialAnalytics: boolean;
};

export type AnalyticsSourceData = {
  companyId: string | null;
  commercialAccess: AnalyticsCommercialAccess;
  companyCompliance: GroupedCompanyCompliance;
  rfqList: AnalyticsRFQ[];
  quoteList: AnalyticsQuote[];
  companyList: AnalyticsCompany[];
  commerciallyOpenRfqIds: string[];
  safeSubmissionCountByRfqId: Record<string, number>;
};

export function canViewIssuerCommercialAnalytics(
  membership:
    | Pick<
        OrganizationMembership,
        "membershipStatus" | "workspaceRole" | "procurementFunction"
      >
    | null,
): boolean {
  return Boolean(
    membership?.membershipStatus === "active" &&
      (membership.workspaceRole === "owner" ||
        membership.workspaceRole === "admin" ||
        membership.procurementFunction === "buyer"),
  );
}

function isValidSafeSubmissionCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0
  );
}

export async function loadAnalyticsSourceData(): Promise<AnalyticsSourceData> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user?.id)
    .single();

  const activeMembership =
    user && profile?.company_id
      ? await getActiveMembershipForUserCompany(
          supabase,
          user.id,
          profile.company_id,
        )
      : null;

  const companyId = activeMembership?.companyId ?? null;
  const commercialAccess: AnalyticsCommercialAccess = {
    canViewIssuerCommercialAnalytics:
      canViewIssuerCommercialAnalytics(activeMembership),
  };

  const [companyCompliance, rfqResult, companiesResult] = await Promise.all([
    companyId
      ? loadCompanyCompliance(supabase, companyId)
      : createEmptyGroupedCompliance(),
    companyId
      ? supabase
          .from("rfqs")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
      : { data: [] as AnalyticsRFQ[], error: null },
    supabase.from("company_directory").select("id,name"),
  ]);

  const { data: rfqs, error: rfqError } = rfqResult;

  if (rfqError) {
    console.error("Analytics RFQ source load failed:", rfqError);
    throw new Error("Unable to load analytics RFQ source data.");
  }

  const rfqList = (rfqs ?? []) as AnalyticsRFQ[];
  const commercialAsOf = new Date();

  const commerciallyOpenRfqIds = rfqList
    .filter((rfq) =>
      isRfqCommercialOpeningUnlocked({
        deadline: rfq.deadline,
        now: commercialAsOf,
      }),
    )
    .map((rfq) => rfq.id);

  const safeSubmissionCountByRfqId =
    commercialAccess.canViewIssuerCommercialAnalytics && rfqList.length > 0
      ? Object.fromEntries(
          await Promise.all(
            rfqList.map(async (rfq) => {
              const { data, error } = await supabase.rpc(
                "count_rfq_quote_submissions",
                {
                  p_rfq_id: rfq.id,
                },
              );

              if (error) {
                console.error(
                  `Analytics safe submission count failed for RFQ ${rfq.id}:`,
                  error,
                );
                throw new Error(
                  "Unable to load analytics submission participation evidence.",
                );
              }

              if (!isValidSafeSubmissionCount(data)) {
                console.error(
                  `Analytics safe submission count returned invalid data for RFQ ${rfq.id}.`,
                  data,
                );
                throw new Error(
                  "Unable to validate analytics submission participation evidence.",
                );
              }

              return [rfq.id, data] as const;
            }),
          ),
        )
      : {};

  const { data: quotes, error: quotesError } =
    commercialAccess.canViewIssuerCommercialAnalytics &&
    commerciallyOpenRfqIds.length > 0
      ? await supabase
          .from("quotes")
          .select("*")
          .in("rfq_id", commerciallyOpenRfqIds)
          .order("created_at", { ascending: false })
      : { data: [] as AnalyticsQuote[], error: null };

  if (quotesError) {
    console.error("Analytics quote source load failed:", quotesError);
    throw new Error("Unable to load analytics quotation source data.");
  }

  const { data: companies, error: companiesError } = companiesResult;

  if (companiesError) {
    console.error("Analytics company directory load failed:", companiesError);
    throw new Error("Unable to load analytics company source data.");
  }

  return {
    companyId,
    commercialAccess,
    companyCompliance,
    rfqList,
    quoteList: (quotes ?? []) as AnalyticsQuote[],
    companyList: (companies ?? []) as AnalyticsCompany[],
    commerciallyOpenRfqIds,
    safeSubmissionCountByRfqId,
  };
}