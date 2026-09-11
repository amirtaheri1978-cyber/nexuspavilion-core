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
  const rfqIds = rfqList.map((rfq) => rfq.id);

  const { data: quotes, error: quotesError } =
    commercialAccess.canViewIssuerCommercialAnalytics &&
    rfqIds.length > 0
      ? await supabase
          .from("quotes")
          .select("*")
          .in("rfq_id", rfqIds)
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
  };
}
