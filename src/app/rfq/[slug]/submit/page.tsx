import { redirect } from "next/navigation";

import { RfqSubmitWorkspace } from "@/components/rfq-workspace/rfq-submit-workspace";
import {
  getCompanyOnboardingPath,
  getSafeNextPath,
} from "@/lib/auth/login-continuation";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function SubmitQuotePage({ params }: PageProps) {
  const { slug } = await params;
  const submitPath = getSafeNextPath(`/rfq/${slug}/submit`);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(submitPath)}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("RFQ submit profile lookup failed:", {
      userId: user.id,
      error: profileError,
    });
    throw new Error("Unable to verify company workspace.");
  }

  if (!profile?.company_id) {
    redirect(getCompanyOnboardingPath(submitPath));
  }

  return <RfqSubmitWorkspace slug={slug} />;
}
