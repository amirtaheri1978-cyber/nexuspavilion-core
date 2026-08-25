import { redirect } from "next/navigation";

import { RfqSubmitWorkspace } from "@/components/rfq-workspace/rfq-submit-workspace";
import { getSafeNextPath } from "@/lib/auth/login-continuation";
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

  return <RfqSubmitWorkspace slug={slug} />;
}
