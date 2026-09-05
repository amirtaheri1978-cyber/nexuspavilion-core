import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import { createClient } from "@/lib/supabase/server";
import type { AnalyticsRFQ } from "@/lib/analytics/procurement-utils";

export type AnalyticsQuote = {
  id: string;
  rfq_id: string;
  company_id: string | null;
  amount: number | string | null;
  decision: string | null;
};

export type AnalyticsCompany = {
  id: string;
  name: string | null;
};

export type AnalyticsSourceData = {
  companyId: string | null;
  rfqList: AnalyticsRFQ[];
  quoteList: AnalyticsQuote[];
  companyList: AnalyticsCompany[];
};

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

  const { data: rfqs } = companyId
    ? await supabase
        .from("rfqs")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
    : { data: [] };

  const rfqList = (rfqs ?? []) as AnalyticsRFQ[];
  const rfqIds = rfqList.map((rfq) => rfq.id);

  const { data: quotes } =
    rfqIds.length > 0
      ? await supabase
          .from("quotes")
          .select("*")
          .in("rfq_id", rfqIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const { data: companies } = await supabase
    .from("company_directory")
    .select("id,name");

  return {
    companyId,
    rfqList,
    quoteList: (quotes ?? []) as AnalyticsQuote[],
    companyList: (companies ?? []) as AnalyticsCompany[],
  };
}
