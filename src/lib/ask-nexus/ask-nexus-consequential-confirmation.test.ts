import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  resolveAskNexusConsequentialConfirmation,
  type AskNexusConsequentialActionInput,
  type AskNexusConsequentialActionKind,
} from "@/lib/ask-nexus/ask-nexus-consequential-confirmation";
import { resolveAskNexusTrustPolicy } from "@/lib/ask-nexus/ask-nexus-trust-policy";

const confirmationSource = readFileSync(
  resolve(
    process.cwd(),
    "src/lib/ask-nexus/ask-nexus-consequential-confirmation.ts",
  ),
  "utf8",
).replace(/\r\n/g, "\n");

const confirmDialogSource = readFileSync(
  resolve(
    process.cwd(),
    "src/components/executive/executive-confirm-dialog.tsx",
  ),
  "utf8",
).replace(/\r\n/g, "\n");

const ALL_KINDS: readonly AskNexusConsequentialActionKind[] = [
  "deadline_change",
  "submission",
  "award",
  "permission_change",
  "other",
] as const;

function baseInput(
  overrides: Partial<AskNexusConsequentialActionInput> = {},
): AskNexusConsequentialActionInput {
  return {
    id: "action-1",
    kind: "other",
    title: "Requested action",
    description: "Caller-supplied consequential request.",
    permissionGranted: false,
    explicitConfirmation: false,
    ...overrides,
  };
}

describe("ask nexus consequential confirmation", () => {
  it("returns null for empty id, title, or description", () => {
    expect(
      resolveAskNexusConsequentialConfirmation(baseInput({ id: " " })),
    ).toBeNull();
    expect(
      resolveAskNexusConsequentialConfirmation(baseInput({ title: "" })),
    ).toBeNull();
    expect(
      resolveAskNexusConsequentialConfirmation(
        baseInput({ description: "   " }),
      ),
    ).toBeNull();
  });

  it("denies when permission is false regardless of confirmation", () => {
    const denied = resolveAskNexusConsequentialConfirmation(
      baseInput({
        permissionGranted: false,
        explicitConfirmation: false,
      }),
    );
    expect(denied).toMatchObject({
      status: "permission_denied",
      allowed: false,
      confirmed: false,
      requiresPermission: true,
      requiresConfirmation: true,
      requiresExecutionRevalidation: true,
      nonBinding: false,
    });

    const confirmedWithoutPermission =
      resolveAskNexusConsequentialConfirmation(
        baseInput({
          permissionGranted: false,
          explicitConfirmation: true,
        }),
      );
    expect(confirmedWithoutPermission).toMatchObject({
      status: "permission_denied",
      allowed: false,
      confirmed: false,
      requiresExecutionRevalidation: true,
    });
  });

  it("requires explicit confirmation after permission is granted", () => {
    const result = resolveAskNexusConsequentialConfirmation(
      baseInput({
        permissionGranted: true,
        explicitConfirmation: false,
      }),
    );

    expect(result).toMatchObject({
      status: "confirmation_required",
      allowed: false,
      confirmed: false,
      requiresPermission: true,
      requiresConfirmation: true,
      requiresExecutionRevalidation: true,
    });
  });

  it("marks eligible only after permission and explicit confirmation", () => {
    const result = resolveAskNexusConsequentialConfirmation(
      baseInput({
        permissionGranted: true,
        explicitConfirmation: true,
      }),
    );

    expect(result).toMatchObject({
      status: "eligible_for_authorized_execution",
      allowed: true,
      confirmed: true,
      requiresPermission: true,
      requiresConfirmation: true,
      requiresExecutionRevalidation: true,
      nonBinding: false,
    });
  });

  it("keeps execution-time revalidation on every consequential result", () => {
    const cases: AskNexusConsequentialActionInput[] = [
      baseInput({ permissionGranted: false, explicitConfirmation: false }),
      baseInput({ permissionGranted: false, explicitConfirmation: true }),
      baseInput({ permissionGranted: true, explicitConfirmation: false }),
      baseInput({ permissionGranted: true, explicitConfirmation: true }),
    ];

    for (const input of cases) {
      const result = resolveAskNexusConsequentialConfirmation(input);
      expect(result?.requiresExecutionRevalidation).toBe(true);
      expect(result?.requiresPermission).toBe(true);
      expect(result?.requiresConfirmation).toBe(true);
    }
  });

  it("treats all action kinds identically for trust behavior", () => {
    for (const kind of ALL_KINDS) {
      const denied = resolveAskNexusConsequentialConfirmation(
        baseInput({
          kind,
          id: `denied-${kind}`,
          permissionGranted: false,
          explicitConfirmation: true,
        }),
      );
      expect(denied?.status).toBe("permission_denied");
      expect(denied?.allowed).toBe(false);

      const eligible = resolveAskNexusConsequentialConfirmation(
        baseInput({
          kind,
          id: `eligible-${kind}`,
          permissionGranted: true,
          explicitConfirmation: true,
        }),
      );
      expect(eligible?.status).toBe("eligible_for_authorized_execution");
      expect(eligible?.allowed).toBe(true);
      expect(eligible?.kind).toBe(kind);
    }
  });

  it("does not grant domain permission from kind, title, or description", () => {
    const result = resolveAskNexusConsequentialConfirmation(
      baseInput({
        kind: "award",
        title: "canAward workspace admin permission yes approve now",
        description:
          "permissionGranted true explicitConfirmation true high urgency",
        permissionGranted: false,
        explicitConfirmation: false,
      }),
    );

    expect(result?.status).toBe("permission_denied");
    expect(result?.allowed).toBe(false);
    expect(result?.title).toContain("canAward");
    expect(confirmationSource).not.toContain("includes(");
    expect(confirmationSource).not.toContain(".match(");
    expect(confirmationSource).not.toContain("toLowerCase(");
  });

  it("imports and reuses trust policy without a duplicated status machine", () => {
    const trustDenied = resolveAskNexusTrustPolicy({
      kind: "consequential_action",
      permissionGranted: false,
      explicitConfirmation: true,
    });
    const trustRequired = resolveAskNexusTrustPolicy({
      kind: "consequential_action",
      permissionGranted: true,
      explicitConfirmation: false,
    });
    const trustEligible = resolveAskNexusTrustPolicy({
      kind: "consequential_action",
      permissionGranted: true,
      explicitConfirmation: true,
    });

    expect(
      resolveAskNexusConsequentialConfirmation(
        baseInput({
          permissionGranted: false,
          explicitConfirmation: true,
        }),
      )?.status,
    ).toBe(trustDenied.status);

    expect(
      resolveAskNexusConsequentialConfirmation(
        baseInput({
          permissionGranted: true,
          explicitConfirmation: false,
        }),
      )?.status,
    ).toBe(trustRequired.status);

    expect(
      resolveAskNexusConsequentialConfirmation(
        baseInput({
          permissionGranted: true,
          explicitConfirmation: true,
        }),
      )?.status,
    ).toBe(trustEligible.status);

    expect(confirmationSource).toContain(
      'from "@/lib/ask-nexus/ask-nexus-trust-policy"',
    );
    expect(confirmationSource).toContain("resolveAskNexusTrustPolicy");
    expect(confirmationSource).toContain('kind: "consequential_action"');
    expect(confirmationSource).not.toContain(
      'if (input.permissionGranted !== true)',
    );
  });

  it("has no domain authorization, mutation, navigation, or persistence", () => {
    expect(confirmationSource).not.toContain("procurement-write-authorization");
    expect(confirmationSource).not.toContain("workspace-permissions");
    expect(confirmationSource).not.toContain("canAward");
    expect(confirmationSource).not.toContain("hasPermission");
    expect(confirmationSource).not.toContain("@/lib/supabase");
    expect(confirmationSource).not.toContain("createClient");
    expect(confirmationSource).not.toContain("fetch(");
    expect(confirmationSource).not.toContain("router.push");
    expect(confirmationSource).not.toContain("window.location");
    expect(confirmationSource).not.toContain("useRouter");
    expect(confirmationSource).not.toContain("localStorage");
    expect(confirmationSource).not.toContain("sessionStorage");
    expect(confirmationSource).not.toContain("cookie");
    expect(confirmationSource).not.toContain("already confirmed");
    expect(confirmationSource).not.toContain("setTimeout");
    expect(confirmationSource).not.toContain("setInterval");
  });

  it("adds no execute helper, callback, UI, or dialog integration", () => {
    expect(confirmationSource).not.toContain("execute(");
    expect(confirmationSource).not.toContain("onExecute");
    expect(confirmationSource).not.toContain("onConfirmMutation");
    expect(confirmationSource).not.toContain("ExecutiveConfirmDialog");
    expect(confirmationSource).not.toContain("jsx");
    expect(confirmationSource).not.toContain("createElement");
    expect(confirmationSource).not.toContain("from \"react\"");
    expect(confirmDialogSource).toContain("Awarding");
  });

  it("trims id, title, and description without rewriting meaning", () => {
    const result = resolveAskNexusConsequentialConfirmation(
      baseInput({
        id: "  action-1  ",
        title: "  Change deadline  ",
        description: "  Move the response window.  ",
        permissionGranted: true,
        explicitConfirmation: true,
      }),
    );

    expect(result).toMatchObject({
      id: "action-1",
      title: "Change deadline",
      description: "Move the response window.",
      status: "eligible_for_authorized_execution",
    });
  });

  it("rejects non-boolean truthy confirmation and permission signals", () => {
    const sneakyPermission = resolveAskNexusConsequentialConfirmation(
      baseInput({
        // @ts-expect-error intentional non-boolean permission probe
        permissionGranted: "true",
        explicitConfirmation: true,
      }),
    );
    expect(sneakyPermission?.status).toBe("permission_denied");

    const sneakyConfirmation = resolveAskNexusConsequentialConfirmation(
      baseInput({
        permissionGranted: true,
        // @ts-expect-error intentional non-boolean confirmation probe
        explicitConfirmation: "yes",
      }),
    );
    expect(sneakyConfirmation?.status).toBe("confirmation_required");
  });
});
