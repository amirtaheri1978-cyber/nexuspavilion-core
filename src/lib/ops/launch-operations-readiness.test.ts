import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { GET as getHealth } from "@/app/api/health/route";
import { LAUNCH_REGRESSION_TEST_FILES } from "@/lib/launch/launch-regression.files";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

function collectSourceFiles(directory: string, files: string[] = []) {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      collectSourceFiles(fullPath, files);
      continue;
    }

    if (/\.(ts|tsx|js|jsx)$/.test(entry) && !entry.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("Task 27 launch operations readiness", () => {
  it("keeps leftover Codespace hosts out of application source", () => {
    const roots = [
      resolve(process.cwd(), "src/app"),
      resolve(process.cwd(), "src/lib"),
      resolve(process.cwd(), "src/components"),
      resolve(process.cwd(), "middleware.ts"),
    ];
    const files = roots.flatMap((root) =>
      statSync(root).isDirectory() ? collectSourceFiles(root) : [root],
    );

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, relative(process.cwd(), file)).not.toContain(
        ".app.github.dev",
      );
    }
  });

  it("exposes a public health probe that does not leak secrets", async () => {
    const healthRoute = readSource("src/app/api/health/route.ts");
    expect(healthRoute).toContain("ok: true");
    expect(healthRoute).not.toContain("RESEND_API_KEY");
    expect(healthRoute).not.toContain("SERVICE_ROLE");
    expect(healthRoute).not.toContain("createClient");

    const response = await getHealth();
    const body = (await response.json()) as {
      ok?: boolean;
      service?: string;
      commitSha?: string | null;
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.service).toBe("nexus-pavilion");
    expect(Object.keys(body).sort()).toEqual(["commitSha", "ok", "service"]);
    expect(JSON.stringify(body)).not.toMatch(
      /SERVICE_ROLE|RESEND_API_KEY|ANON_KEY|password/i,
    );
  });

  it("does not log invitation tokens from the accept route", () => {
    const acceptRoute = readSource(
      "src/app/api/company-invitations/accept/route.ts",
    );

    expect(acceptRoute).toContain("Invitation acceptance RPC failed.");
    expect(acceptRoute).toContain("invitation_token: token");

    const consoleCalls = [
      ...acceptRoute.matchAll(/console\.(?:error|warn)\(([\s\S]*?)\);/g),
    ];
    expect(consoleCalls.length).toBeGreaterThan(0);
    for (const call of consoleCalls) {
      expect(call[1]).not.toMatch(/\btoken\b/);
    }
  });

  it("records operational runbook and Task 28 operator evidence", () => {
    expect(
      existsSync(
        resolve(process.cwd(), "docs/operations/LAUNCH_OPERATIONS_RUNBOOK.md"),
      ),
    ).toBe(true);
    expect(
      existsSync(
        resolve(process.cwd(), "docs/operations/TASK_28_OPERATOR_EVIDENCE.md"),
      ),
    ).toBe(true);

    const runbook = readSource("docs/operations/LAUNCH_OPERATIONS_RUNBOOK.md");
    const evidence = readSource(
      "docs/operations/TASK_28_OPERATOR_EVIDENCE.md",
    );
    expect(runbook).toContain("Failed deployment");
    expect(runbook).toContain("Application rollback");
    expect(runbook).toContain("Database migration rollback");
    expect(runbook).toContain("Production backup verification");
    expect(runbook).toContain("Supabase incident");
    expect(runbook).toContain("Authentication outage");
    expect(runbook).toContain("RFQ/quote write failure");
    expect(runbook).toContain("Award integrity incident");
    expect(runbook).toContain("Cross-company/security incident");
    expect(runbook).toContain("Document/storage incident");
    expect(runbook).not.toContain("PITR is enabled");
    expect(evidence).not.toContain("PITR is enabled");
    expect(runbook).not.toContain(
      "Production project ref ≠ Development project ref",
    );
    expect(evidence).toContain(
      "launch required a second, distinct Supabase project is **superseded**",
    );

    expect(evidence).toContain("nexus-pavilion-dev");
    expect(evidence).toContain("bzntqnwoytdakmstbtyh");
    expect(runbook).toContain("nexus-pavilion-dev");
    expect(runbook).toContain("bzntqnwoytdakmstbtyh");

    expect(evidence).toContain("DO NOT RE-APPLY 280 OR 290");
    expect(runbook).toContain("DO NOT RE-APPLY 280 OR 290");
    expect(evidence).toContain(
      "20260828000000_enable_company_scoped_audit_and_notification_access.sql",
    );
    expect(evidence).toContain(
      "20260829000000_restrict_issuer_quote_select_until_commercial_unlock.sql",
    );
    expect(evidence).toContain("already applied");

    expect(evidence).toContain(
      "backups/nexus-pavilion-dev-prelaunch-2026-08-22.dump",
    );
    expect(evidence).toContain("445004");
    expect(evidence).toContain(
      "6A7D76ACDE4E7D8C7CF7FA7761809639C2EDE38F10A2CD9D541D4D3F9621D687",
    );
    expect(evidence).toContain("pg_restore -l");
    expect(evidence).toContain("541");
    expect(evidence).toContain("17.6");

    expect(evidence).toContain("branding/logo-horizontal-512.png");
    expect(evidence).toContain("60026");
    expect(evidence).toContain(
      "526D1AA097B65BDA0B9F8C243EACC50663C3F3FC4218DBBF7D271ED90CE5EA98",
    );
    expect(evidence).toContain(
      "Company-logos/293b1013-f488-48a5-ae63-e028569519ee-1785587789135.png",
    );
    expect(evidence).toContain("3696");
    expect(evidence).toContain(
      "23F1656A4FE72D62B81C8605DFE6006E17AB258EC626F08560B483A92FF0257D",
    );
    expect(evidence).toContain(
      "Company-logos/logos/1779691535466-7d651ea6-3845-466f-8fb9-ea89f8038379.jpg",
    );
    expect(evidence).toContain("31282");
    expect(evidence).toContain(
      "06651FFB10077DBBDCA7F0206B91501B9F4F13F97E80C549A93ADFC65CD48591",
    );

    expect(evidence).toContain("Free Plan");
    expect(evidence).toContain("unavailable / not enabled");
    expect(evidence).toContain("chose **not** to purchase PITR");
    expect(runbook).toContain("Free Plan");
    expect(runbook).toContain("unavailable");

    expect(evidence).toContain(
      "docs/operations/sql/task28_reverse_20260828000000.sql",
    );
    expect(evidence).toContain(
      "docs/operations/sql/task28_reverse_20260829000000.sql",
    );
    expect(runbook).toContain(
      "docs/operations/sql/task28_reverse_20260829000000.sql",
    );
    expect(runbook).toContain("application rollback or forward-fix first");
    expect(runbook).toContain("emergency-only");
    expect(runbook).toContain("known pre-290 confidentiality/integrity weakness");

    expect(runbook).toContain("Real public application origin");
    expect(runbook).toContain("Application deployment SHA");
    expect(runbook).toContain("NEXT_PUBLIC_SITE_URL");
    expect(runbook).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(runbook).toContain("Auth redirect URL configuration");
    expect(runbook).toContain("CONTACT_EMAIL");
    expect(runbook).toContain("Final Product Owner Go/No-Go");
    expect(runbook).toContain("D1–D6");
    expect(evidence).not.toContain("Production Supabase project unknown");
    expect(runbook).not.toContain("280/290 not applied");

    const gitignore = readSource(".gitignore");
    expect(gitignore).toContain("/backups/");
  });

  it("keeps env example names-only and committable", () => {
    const gitignore = readSource(".gitignore");
    const envExample = readSource(".env.example");

    expect(gitignore).toContain(".env*");
    expect(gitignore).toContain("!.env.example");
    expect(envExample).toContain("NEXT_PUBLIC_SUPABASE_URL=");
    expect(envExample).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY=");
    expect(envExample).toContain("NEXT_PUBLIC_SITE_URL=");
    expect(envExample).toContain("RESEND_API_KEY=");
    expect(envExample).toContain("EMAIL_FROM=");
    expect(envExample).toContain("CONTACT_EMAIL=");
    expect(envExample).toContain(
      "Do not configure SUPABASE_SERVICE_ROLE_KEY in the Next.js application.",
    );
    expect(envExample).not.toMatch(/eyJ|sk_live|sb_secret|ghp_/);
  });

  it("includes Task 27 readiness tests in the launch allowlist", () => {
    expect(LAUNCH_REGRESSION_TEST_FILES).toContain(
      "src/lib/ops/launch-operations-readiness.test.ts",
    );
    expect(LAUNCH_REGRESSION_TEST_FILES).toContain(
      "src/lib/ops/public-site-url.test.ts",
    );
  });
});
