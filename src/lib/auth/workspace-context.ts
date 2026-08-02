import type {
  SupabaseClient,
  User,
} from "@supabase/supabase-js";

import {
  getActiveMembershipForUser,
  MembershipLookupError,
  type MembershipStatus,
  type MembershipType,
  type OrganizationMembership,
  type ProcurementFunction,
  type WorkspaceRole,
} from "@/lib/auth/membership";

type LegacyProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
  company_id: string | null;
};

export type WorkspaceContextSource =
  | "membership"
  | "legacy_profile"
  | "none";

export type WorkspaceContext = {
  user: User;
  userId: string;
  email: string | null;

  /*
   * During the migration period, companyId may fall back to the
   * legacy profiles.company_id value when no active membership exists.
   *
   * This fallback supports migration compatibility and must not be
   * treated by itself as sufficient authorization for sensitive
   * mutations.
   */
  companyId: string | null;

  workspaceRole: WorkspaceRole | null;
  procurementFunction: ProcurementFunction | null;
  membershipType: MembershipType | null;
  membershipStatus: MembershipStatus | null;

  membership: OrganizationMembership | null;

  migration: {
    source: WorkspaceContextSource;
    hasLegacyCompany: boolean;
    hasActiveMembership: boolean;
    companyMatchesLegacyProfile: boolean;
    isConsistent: boolean;
  };
};

export type WorkspaceContextErrorCode =
  | "UNAUTHENTICATED"
  | "PROFILE_LOOKUP_FAILED"
  | "PROFILE_NOT_FOUND"
  | "MEMBERSHIP_LOOKUP_FAILED";

export class WorkspaceContextError extends Error {
  constructor(
    message: string,
    public readonly code: WorkspaceContextErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "WorkspaceContextError";
  }
}

/**
 * Resolves the current user's workspace context.
 *
 * This function supports the migration period and may fall back to
 * profiles.company_id when an active organization membership is not
 * available.
 *
 * Callers performing sensitive mutations must separately enforce
 * active-membership and domain-specific authorization requirements.
 */
export async function getCurrentWorkspaceContext(
  supabase: SupabaseClient,
): Promise<WorkspaceContext> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new WorkspaceContextError(
      "An authenticated user is required.",
      "UNAUTHENTICATED",
      userError,
    );
  }

  const {
    data: profileData,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("id, email, role, company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new WorkspaceContextError(
      "Unable to load the current user profile.",
      "PROFILE_LOOKUP_FAILED",
      profileError,
    );
  }

  if (!profileData) {
    throw new WorkspaceContextError(
      "The current user profile does not exist.",
      "PROFILE_NOT_FOUND",
    );
  }

  const profile = profileData as LegacyProfileRow;

  let membership: OrganizationMembership | null = null;

  try {
    membership = await getActiveMembershipForUser(
      supabase,
      user.id,
    );
  } catch (error) {
    throw new WorkspaceContextError(
      "Unable to load the current organization membership.",
      "MEMBERSHIP_LOOKUP_FAILED",
      error instanceof MembershipLookupError
        ? error.cause
        : error,
    );
  }

  const hasLegacyCompany =
    profile.company_id !== null;

  const hasActiveMembership =
    membership !== null;

  const companyMatchesLegacyProfile =
    membership === null
      ? profile.company_id === null
      : membership.companyId ===
        profile.company_id;

  const source: WorkspaceContextSource =
    membership
      ? "membership"
      : profile.company_id
        ? "legacy_profile"
        : "none";

  return {
    user,
    userId: user.id,
    email:
      user.email ??
      profile.email ??
      null,

    companyId:
      membership?.companyId ??
      profile.company_id,

    workspaceRole:
      membership?.workspaceRole ??
      null,

    procurementFunction:
      membership?.procurementFunction ??
      null,

    membershipType:
      membership?.membershipType ??
      null,

    membershipStatus:
      membership?.membershipStatus ??
      null,

    membership,

    migration: {
      source,
      hasLegacyCompany,
      hasActiveMembership,
      companyMatchesLegacyProfile,
      isConsistent:
        companyMatchesLegacyProfile,
    },
  };
}