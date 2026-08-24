import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { LAUNCH_REGRESSION_TEST_FILES } from "@/lib/launch/launch-regression.files";

describe("Task 25 launch-regression catalog", () => {
  it("points only at files that exist on disk", () => {
    expect(LAUNCH_REGRESSION_TEST_FILES.length).toBeGreaterThan(70);

    for (const relativePath of LAUNCH_REGRESSION_TEST_FILES) {
      expect(existsSync(resolve(process.cwd(), relativePath)), relativePath).toBe(
        true,
      );
    }
  });

  it("keeps the allowlist unique and launch-gated", () => {
    expect(new Set(LAUNCH_REGRESSION_TEST_FILES).size).toBe(
      LAUNCH_REGRESSION_TEST_FILES.length,
    );
    expect(LAUNCH_REGRESSION_TEST_FILES).toContain(
      "src/lib/launch/launch-candidate-invariants.test.ts",
    );
    expect(LAUNCH_REGRESSION_TEST_FILES).toContain(
      "src/lib/launch/procurement-write-route-guards.test.ts",
    );
    expect(LAUNCH_REGRESSION_TEST_FILES).toContain(
      "src/lib/auth/login-continuation.test.ts",
    );
    expect(LAUNCH_REGRESSION_TEST_FILES).toContain(
      "src/lib/navigation/application-nav.test.ts",
    );
    expect(LAUNCH_REGRESSION_TEST_FILES).toContain(
      "src/lib/procurement/procurement-write-authorization.test.ts",
    );
    expect(LAUNCH_REGRESSION_TEST_FILES).toContain(
      "src/components/rfq-workspace/rfq-invite-quote-submission.test.ts",
    );
    expect(LAUNCH_REGRESSION_TEST_FILES).toContain(
      "src/lib/design-system/executive-contract.test.ts",
    );
    expect(LAUNCH_REGRESSION_TEST_FILES).toContain(
      "src/lib/procurement/award-rfq-quote-integrity-migration.test.ts",
    );
    expect(LAUNCH_REGRESSION_TEST_FILES).toContain(
      "src/lib/procurement/award-activity-propagation-migration.test.ts",
    );
    expect(LAUNCH_REGRESSION_TEST_FILES).toContain(
      "src/lib/company-scoped-audit-notification-access-migration.test.ts",
    );
    expect(LAUNCH_REGRESSION_TEST_FILES).toContain(
      "src/lib/launch/rfq-activity-audit-write-contract.test.ts",
    );
  });
});
