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
