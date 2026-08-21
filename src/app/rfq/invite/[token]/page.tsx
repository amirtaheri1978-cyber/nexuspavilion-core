import {
  RfqInviteQuoteSubmission,
  RfqInviteQuoteUnavailable,
} from "@/components/rfq-workspace/rfq-invite-quote-submission";
import { EXECUTIVE_PAGE_CLASS } from "@/lib/design-system/executive-contract";
import { createClient } from "@/lib/supabase/server";

type InvitationContext = {
  invite_id: string;
  invite_email: string;
  invite_status: string;
  rfq_id: string;
  rfq_title: string;
  rfq_slug: string;
  rfq_description: string | null;
  rfq_category: string | null;
  rfq_location: string | null;
  rfq_budget: string | null;
  rfq_deadline: string;
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const cleanToken = token.trim();
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("get_rfq_invitation_context", { p_token: cleanToken })
    .maybeSingle();

  const invitation = data as InvitationContext | null;

  if (error || !invitation) {
    return (
      <main className="min-h-screen bg-nexus-navy text-white">
        <div className={`${EXECUTIVE_PAGE_CLASS} min-w-0`}>
          <RfqInviteQuoteUnavailable />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-nexus-navy text-white">
      <div className={`${EXECUTIVE_PAGE_CLASS} min-w-0`}>
        <RfqInviteQuoteSubmission invitation={invitation} />
      </div>
    </main>
  );
}
