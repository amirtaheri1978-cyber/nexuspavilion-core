import { describe, expect, it } from "vitest";

import {
  WORKSPACE_ALREADY_CONNECTED_ERROR,
  WORKSPACE_BOOTSTRAP_INCOMPLETE_ERROR,
  WORKSPACE_RECOVERY_REQUIRED_ERROR,
  getFriendlyWorkspaceCreateError,
  planOwnedCompanyResolution,
} from "@/lib/auth/workspace-bootstrap";

describe("owned company resolution", () => {
  it("keeps an existing profile company connection as a conflict", () => {
    expect(
      planOwnedCompanyResolution({
        profileCompanyId: "company-a",
        ownedCompanyIds: ["company-a"],
      }),
    ).toEqual({ action: "already_connected" });
  });

  it("recovers a missing profile when exactly one owned company exists", () => {
    expect(
      planOwnedCompanyResolution({
        profileCompanyId: null,
        ownedCompanyIds: ["company-a"],
      }),
    ).toEqual({
      action: "recover",
      companyId: "company-a",
    });
  });

  it("fails closed when multiple owned orphan companies exist", () => {
    expect(
      planOwnedCompanyResolution({
        profileCompanyId: null,
        ownedCompanyIds: ["company-a", "company-b"],
      }),
    ).toEqual({ action: "recovery_required" });
  });

  it("creates normally when no owned company exists", () => {
    expect(
      planOwnedCompanyResolution({
        profileCompanyId: undefined,
        ownedCompanyIds: [],
      }),
    ).toEqual({ action: "create" });
  });

  it("does not create a second company on retry when one owned company already exists", () => {
    const firstAttempt = planOwnedCompanyResolution({
      profileCompanyId: null,
      ownedCompanyIds: [],
    });
    const retry = planOwnedCompanyResolution({
      profileCompanyId: null,
      ownedCompanyIds: ["company-a"],
    });

    expect(firstAttempt).toEqual({ action: "create" });
    expect(retry).toEqual({
      action: "recover",
      companyId: "company-a",
    });
    expect(retry.action).not.toBe("create");
  });
});

describe("workspace create error copy", () => {
  it("does not encourage another company create after a partial write", () => {
    expect(
      getFriendlyWorkspaceCreateError(WORKSPACE_BOOTSTRAP_INCOMPLETE_ERROR),
    ).toBe(WORKSPACE_BOOTSTRAP_INCOMPLETE_ERROR);
    expect(
      getFriendlyWorkspaceCreateError(WORKSPACE_BOOTSTRAP_INCOMPLETE_ERROR),
    ).toContain("Do not create another company");
    expect(
      getFriendlyWorkspaceCreateError(WORKSPACE_RECOVERY_REQUIRED_ERROR),
    ).toBe(WORKSPACE_RECOVERY_REQUIRED_ERROR);
    expect(
      getFriendlyWorkspaceCreateError(WORKSPACE_ALREADY_CONNECTED_ERROR),
    ).toBe(WORKSPACE_ALREADY_CONNECTED_ERROR);
  });

  it("does not expose provider or sql text", () => {
    expect(
      getFriendlyWorkspaceCreateError(
        'duplicate key value violates unique constraint "profiles_pkey"',
      ),
    ).not.toContain("profiles_pkey");
    expect(
      getFriendlyWorkspaceCreateError("PGRST301: JWT expired"),
    ).not.toContain("PGRST");
    expect(
      getFriendlyWorkspaceCreateError("permission denied for table profiles"),
    ).not.toContain("permission denied");
  });
});
