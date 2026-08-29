import type { SupabaseClient, User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/membership", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/membership")>();

  return {
    ...actual,
    getActiveMembershipForUser: vi.fn(),
    getActiveMembershipForUserCompany: vi.fn(),
  };
});

import {
  getActiveMembershipForUser,
  getActiveMembershipForUserCompany,
  MembershipLookupError,
  type OrganizationMembership,
} from "@/lib/auth/membership";
import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
  type WorkspaceContextErrorCode,
} from "@/lib/auth/workspace-context";

const USER_ID = "081decc5-ab1e-4091-bf01-21122a1147d1";
const PROFILE_COMPANY_ID = "293b1013-f488-48a5-ae63-e028569519ee";
const OTHER_COMPANY_ID = "95c1ab3d-d513-4da7-8461-386ae17a1186";

const TEST_USER = {
  id: USER_ID,
  email: "owner@example.com",
} as User;

const PROFILE_WITH_COMPANY = {
  id: USER_ID,
  email: "owner@example.com",
  role: "owner",
  company_id: PROFILE_COMPANY_ID,
};

const PROFILE_WITHOUT_COMPANY = {
  ...PROFILE_WITH_COMPANY,
  company_id: null,
};

const PROFILE_MEMBERSHIP: OrganizationMembership = {
  id: "db689874-4d25-4dc0-8d0c-a8121cd253b6",
  userId: USER_ID,
  companyId: PROFILE_COMPANY_ID,
  workspaceRole: "owner",
  procurementFunction: "buyer",
  membershipType: "founder",
  membershipStatus: "active",
  jobTitle: null,
  jobFunction: null,
  invitedBy: null,
  joinedAt: null,
};

const OTHER_MEMBERSHIP: OrganizationMembership = {
  ...PROFILE_MEMBERSHIP,
  id: "6c5f6ba9-1d70-43b1-b477-17b25ffc76ef",
  companyId: OTHER_COMPANY_ID,
  procurementFunction: "none",
};

const getGenericMembership = vi.mocked(getActiveMembershipForUser);
const getScopedMembership = vi.mocked(getActiveMembershipForUserCompany);

type ClientOptions = {
  user?: User | null;
  userError?: unknown;
  profileData?: typeof PROFILE_WITH_COMPANY | null;
  profileError?: unknown;
};

function createSupabaseClient({
  user = TEST_USER,
  userError = null,
  profileData = PROFILE_WITH_COMPANY,
  profileError = null,
}: ClientOptions = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: profileData,
    error: profileError,
  });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: userError,
      }),
    },
    from,
  } as unknown as SupabaseClient;
}

async function expectWorkspaceContextError(
  promise: Promise<unknown>,
  code: WorkspaceContextErrorCode,
) {
  const error = await promise.then(
    () => null,
    (caught) => caught,
  );

  expect(error).toBeInstanceOf(WorkspaceContextError);
  expect((error as WorkspaceContextError).code).toBe(code);

  return error as WorkspaceContextError;
}

describe("getCurrentWorkspaceContext", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("resolves the matching company-scoped active membership when profile.company_id exists", async () => {
    const supabase = createSupabaseClient();
    getScopedMembership.mockResolvedValue(PROFILE_MEMBERSHIP);

    const context = await getCurrentWorkspaceContext(supabase);

    expect(getScopedMembership).toHaveBeenCalledWith(
      supabase,
      USER_ID,
      PROFILE_COMPANY_ID,
    );
    expect(getGenericMembership).not.toHaveBeenCalled();
    expect(context.membership).toEqual(PROFILE_MEMBERSHIP);
    expect(context.companyId).toBe(PROFILE_COMPANY_ID);
    expect(context.workspaceRole).toBe("owner");
    expect(context.procurementFunction).toBe("buyer");
    expect(context.migration.source).toBe("membership");
    expect(context.migration.hasActiveMembership).toBe(true);
    expect(context.migration.companyMatchesLegacyProfile).toBe(true);
  });

  it("uses the company-scoped resolver for a user with conceptual multiple memberships", async () => {
    const supabase = createSupabaseClient();
    const ambiguousCause = {
      code: "PGRST116",
      details: "Results contain 2 rows",
      hint: null,
      message: "JSON object requested, multiple rows returned",
    };

    getGenericMembership.mockRejectedValue(
      new MembershipLookupError(
        "Unable to load the active organization membership.",
        ambiguousCause,
      ),
    );
    getScopedMembership.mockResolvedValue(PROFILE_MEMBERSHIP);

    const context = await getCurrentWorkspaceContext(supabase);

    expect(context.companyId).toBe(PROFILE_COMPANY_ID);
    expect(context.membership).toEqual(PROFILE_MEMBERSHIP);
    expect(getScopedMembership).toHaveBeenCalledTimes(1);
    expect(getGenericMembership).not.toHaveBeenCalled();
  });

  it("preserves the legacy company fallback with null authority when the selected company has no active membership", async () => {
    const supabase = createSupabaseClient();
    getScopedMembership.mockResolvedValue(null);

    const context = await getCurrentWorkspaceContext(supabase);

    expect(context.companyId).toBe(PROFILE_COMPANY_ID);
    expect(context.membership).toBeNull();
    expect(context.workspaceRole).toBeNull();
    expect(context.procurementFunction).toBeNull();
    expect(context.membershipType).toBeNull();
    expect(context.membershipStatus).toBeNull();
    expect(context.migration.source).toBe("legacy_profile");
    expect(context.migration.hasLegacyCompany).toBe(true);
    expect(context.migration.hasActiveMembership).toBe(false);
    expect(context.migration.companyMatchesLegacyProfile).toBe(false);
    expect(context.migration.isConsistent).toBe(false);
    expect(getGenericMembership).not.toHaveBeenCalled();
  });

  it("maps a company-scoped membership lookup failure to MEMBERSHIP_LOOKUP_FAILED", async () => {
    const supabase = createSupabaseClient();
    const providerCause = {
      code: "PGRST999",
      details: "provider failure",
      hint: null,
      message: "query failed",
    };

    getScopedMembership.mockRejectedValue(
      new MembershipLookupError(
        "Unable to load the active organization membership.",
        providerCause,
      ),
    );

    const error = await expectWorkspaceContextError(
      getCurrentWorkspaceContext(supabase),
      "MEMBERSHIP_LOOKUP_FAILED",
    );

    expect(error.cause).toBe(providerCause);
    expect(getGenericMembership).not.toHaveBeenCalled();
  });

  it("fails closed when profile.company_id is null and the generic membership lookup is ambiguous", async () => {
    const supabase = createSupabaseClient({
      profileData: PROFILE_WITHOUT_COMPANY,
    });
    const ambiguousCause = {
      code: "PGRST116",
      details: "Results contain 2 rows",
      hint: null,
      message: "JSON object requested, multiple rows returned",
    };

    getGenericMembership.mockRejectedValue(
      new MembershipLookupError(
        "Unable to load the active organization membership.",
        ambiguousCause,
      ),
    );

    const error = await expectWorkspaceContextError(
      getCurrentWorkspaceContext(supabase),
      "MEMBERSHIP_LOOKUP_FAILED",
    );

    expect(error.cause).toBe(ambiguousCause);
    expect(getScopedMembership).not.toHaveBeenCalled();
  });

  it("returns UNAUTHENTICATED when no authenticated user is available", async () => {
    const supabase = createSupabaseClient({ user: null });

    await expectWorkspaceContextError(
      getCurrentWorkspaceContext(supabase),
      "UNAUTHENTICATED",
    );

    expect(getScopedMembership).not.toHaveBeenCalled();
    expect(getGenericMembership).not.toHaveBeenCalled();
  });

  it("returns PROFILE_LOOKUP_FAILED when the profile query fails", async () => {
    const supabase = createSupabaseClient({
      profileError: { message: "profile lookup failed" },
    });

    await expectWorkspaceContextError(
      getCurrentWorkspaceContext(supabase),
      "PROFILE_LOOKUP_FAILED",
    );

    expect(getScopedMembership).not.toHaveBeenCalled();
    expect(getGenericMembership).not.toHaveBeenCalled();
  });

  it("returns PROFILE_NOT_FOUND when the authenticated user's profile does not exist", async () => {
    const supabase = createSupabaseClient({ profileData: null });

    await expectWorkspaceContextError(
      getCurrentWorkspaceContext(supabase),
      "PROFILE_NOT_FOUND",
    );

    expect(getScopedMembership).not.toHaveBeenCalled();
    expect(getGenericMembership).not.toHaveBeenCalled();
  });

  it("uses the sole generic active membership when profile.company_id is null", async () => {
    const supabase = createSupabaseClient({
      profileData: PROFILE_WITHOUT_COMPANY,
    });
    getGenericMembership.mockResolvedValue(OTHER_MEMBERSHIP);

    const context = await getCurrentWorkspaceContext(supabase);

    expect(getGenericMembership).toHaveBeenCalledWith(supabase, USER_ID);
    expect(getScopedMembership).not.toHaveBeenCalled();
    expect(context.membership).toEqual(OTHER_MEMBERSHIP);
    expect(context.companyId).toBe(OTHER_COMPANY_ID);
    expect(context.workspaceRole).toBe("owner");
    expect(context.migration.source).toBe("membership");
    expect(context.migration.hasLegacyCompany).toBe(false);
    expect(context.migration.hasActiveMembership).toBe(true);
    expect(context.migration.companyMatchesLegacyProfile).toBe(false);
  });
});
