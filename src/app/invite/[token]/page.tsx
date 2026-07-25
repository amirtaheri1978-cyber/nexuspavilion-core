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

type Invitation = {
  id: string;
  company_id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  invited_by: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  created_at: string | null;
  companies?: {
    id: string;
    name: string | null;
    slug: string | null;
    category: string | null;
    location: string | null;
    logo_url: string | null;
  } | null;
};

type InvitationStatus = {
  label: string;
  tone: "neutral" | "warning" | "success";
};

function formatRole(role: string | null | undefined) {
  if (role === "admin") return "Workspace Administrator";
  if (role === "buyer") return "Procurement Buyer";

  return "Supplier Representative";
}

function formatInvitationStatus(
  status: string,
  expired: boolean,
): InvitationStatus {
  if (expired) {
    return {
      label: "Invitation Expired",
      tone: "warning",
    };
  }

  if (status === "accepted") {
    return {
      label: "Access Activated",
      tone: "success",
    };
  }

  if (status === "pending") {
    return {
      label: "Pending Identity Verification",
      tone: "warning",
    };
  }

  return {
    label: "Invitation Unavailable",
    tone: "neutral",
  };
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;

  return new Date(expiresAt).getTime() < Date.now();
}

function resolveAccessState({
  hasUser,
  emailMismatch,
  expired,
  alreadyAccepted,
  notPending,
}: {
  hasUser: boolean;
  emailMismatch: boolean;
  expired: boolean;
  alreadyAccepted: boolean;
  notPending: boolean;
}): ExecutiveAccessState {
  if (!hasUser) return "unauthenticated";
  if (emailMismatch) return "identity_mismatch";
  if (expired) return "expired";
  if (alreadyAccepted) return "accepted";
  if (notPending) return "unavailable";

  return "ready";
}

export default async function InviteAcceptPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: invitationData } = await supabase
    .from("invitations")
    .select(
      `
        *,
        companies (
          id,
          name,
          slug,
          category,
          location,
          logo_url
        )
      `,
    )
    .eq("token", token)
    .single();

  const invitation = invitationData as Invitation | null;

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

  const expired = isExpired(invitation.expires_at);
  const alreadyAccepted = invitation.status === "accepted";
  const notPending = invitation.status !== "pending";

  const userEmail = String(user?.email || "").trim().toLowerCase();
  const invitedEmail = String(invitation.email || "").trim().toLowerCase();
  const emailMismatch = Boolean(user && userEmail !== invitedEmail);

  const accessState = resolveAccessState({
    hasUser: Boolean(user),
    emailMismatch,
    expired,
    alreadyAccepted,
    notPending,
  });

  const signupHref = `/invite/${invitation.token}/signup`;
  const status = formatInvitationStatus(invitation.status, expired);

  const companyName =
    invitation.companies?.name || "Authorized Company Workspace";

  const companyCategory =
    invitation.companies?.category || "Enterprise Procurement";

  const companyLocation =
    invitation.companies?.location || "Location not specified";

  const roleLabel = formatRole(invitation.role);

  return (
    <ExecutiveAccessGateway
      state={accessState}
      companyName={companyName}
      companyCategory={companyCategory}
      companyLocation={companyLocation}
      companyLogoUrl={invitation.companies?.logo_url || null}
      invitationEmail={invitation.email}
      authenticatedEmail={user?.email || "Unknown identity"}
      roleLabel={roleLabel}
      statusLabel={status.label}
      statusTone={status.tone}
      signupHref={signupHref}
      invitationToken={invitation.token}
    />
  );
}
