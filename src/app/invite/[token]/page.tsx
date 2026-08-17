import {
  ExecutiveAccessGateway,
  ExecutiveAccessPageShell,
} from "@/components/executive/invitation/executive-access-gateway";
import type { ExecutiveAccessState } from "@/components/executive/invitation/executive-access-journey";
import { ExecutiveAccessStateCard } from "@/components/executive/invitation/executive-access-state";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

type InvitationContext = {
  invite_email: string | null;
  invite_role: string | null;
  invite_status: string | null;
  invite_expires_at: string | null;
  company_name: string | null;
  company_category: string | null;
  company_location: string | null;
  company_logo_url: string | null;
};

function formatRole(role: string | null | undefined) {
  if (role === "admin") return "Workspace Administrator";
  if (role === "buyer") return "Procurement Buyer";

  return "Supplier Representative";
}

function getInvitationLoginHref(token: string) {
  return `/login?next=${encodeURIComponent(`/invite/${token}`)}`;
}

function resolveAccessState({
  hasUser,
  emailMismatch,
}: {
  hasUser: boolean;
  emailMismatch: boolean;
}): ExecutiveAccessState {
  if (!hasUser) return "unauthenticated";
  if (emailMismatch) return "identity_mismatch";

  return "ready";
}

export default async function InviteAcceptPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const loginHref = getInvitationLoginHref(token);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: invitationData } = await supabase
    .rpc("get_organization_invitation_context", {
      p_token: token,
    })
    .maybeSingle();

  const invitation = invitationData as InvitationContext | null;

  if (!invitation) {
    return (
      <ExecutiveAccessPageShell>
        <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-xl items-center">
          <ExecutiveAccessStateCard
            eyebrow="Secure Access Validation"
            title="Invitation could not be verified"
            message="This workspace invitation is invalid, has been withdrawn, or is no longer available. Contact the workspace administrator if you require a new access authorization."
            actionHref="/login"
            actionLabel="Return to Secure Sign In"
          />
        </div>
      </ExecutiveAccessPageShell>
    );
  }

  const userEmail = String(user?.email || "").trim().toLowerCase();
  const invitedEmail = String(invitation.invite_email || "")
    .trim()
    .toLowerCase();
  const emailMismatch = Boolean(user && userEmail !== invitedEmail);

  const accessState = resolveAccessState({
    hasUser: Boolean(user),
    emailMismatch,
  });

  const signupHref = `/invite/${token}/signup`;
  const companyName =
    invitation.company_name || "Authorized Company Workspace";
  const companyCategory =
    invitation.company_category || "Enterprise Procurement";
  const companyLocation =
    invitation.company_location || "Location not specified";
  const roleLabel = formatRole(invitation.invite_role);

  return (
    <ExecutiveAccessGateway
      state={accessState}
      companyName={companyName}
      companyCategory={companyCategory}
      companyLocation={companyLocation}
      companyLogoUrl={invitation.company_logo_url || null}
      invitationEmail={invitation.invite_email || ""}
      authenticatedEmail={user?.email || "Unknown identity"}
      roleLabel={roleLabel}
      statusLabel="Pending Identity Verification"
      statusTone="warning"
      signupHref={signupHref}
      loginHref={loginHref}
      invitationToken={token}
    />
  );
}
