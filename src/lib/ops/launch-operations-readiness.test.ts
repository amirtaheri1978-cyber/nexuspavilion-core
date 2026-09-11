import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as getHealth } from "@/app/api/health/route";
import { LAUNCH_REGRESSION_TEST_FILES } from "@/lib/launch/launch-regression.files";

vi.mock("server-only", () => ({}));

const sentryMocks = vi.hoisted(() => {
  const captureMessage = vi.fn();
  const withScope = vi.fn((callback: (scope: {
    setTag: ReturnType<typeof vi.fn>;
    setContext: ReturnType<typeof vi.fn>;
  }) => void) => {
    callback({
      setTag: vi.fn(),
      setContext: vi.fn(),
    });
  });

  return { captureMessage, withScope };
});

vi.mock("@sentry/nextjs", () => ({
  withScope: sentryMocks.withScope,
  captureMessage: sentryMocks.captureMessage,
  captureException: vi.fn(),
}));

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

    expect(acceptRoute).toContain("reportCriticalApiFailure");
    expect(acceptRoute).toContain('domain: "workspace_invitation"');
    expect(acceptRoute).toContain('operation: "accept"');
    expect(acceptRoute).toContain("invitation_token: token");
    expect(acceptRoute).not.toContain(
      "Invitation acceptance RPC failed.",
    );
    expect(acceptRoute).not.toMatch(
      /console\.error\(\s*["']Unexpected invitation acceptance failure/,
    );

    const consoleCalls = [
      ...acceptRoute.matchAll(/console\.(?:error|warn)\(([\s\S]*?)\);/g),
    ];
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

describe("Task 15-01 production error tracking", () => {
  it("wires @sentry/nextjs dependency and instrumentation files without secrets", () => {
    const packageJson = readSource("package.json");
    const instrumentation = readSource("src/instrumentation.ts");
    const clientInstrumentation = readSource("src/instrumentation-client.ts");
    const serverConfig = readSource("src/sentry.server.config.ts");
    const edgeConfig = readSource("src/sentry.edge.config.ts");
    const nextConfig = readSource("next.config.ts");
    const envExample = readSource(".env.example");
    const sharedOptions = readSource("src/lib/ops/sentry-error-tracking.ts");

    expect(packageJson).toContain('"@sentry/nextjs"');
    expect(instrumentation).toContain("sanitizeSentryRequestPath(request.path)");
    expect(instrumentation).toContain("Sentry.captureRequestError(");
    expect(instrumentation).toContain('await import("./sentry.server.config")');
    expect(instrumentation).toContain('await import("./sentry.edge.config")');
    expect(sharedOptions).toContain("export function sanitizeSentryRequestPath");
    expect(clientInstrumentation).toContain("Sentry.init(");
    expect(clientInstrumentation).toContain("NEXT_PUBLIC_SENTRY_DSN");
    expect(serverConfig).toContain("Sentry.init(");
    expect(edgeConfig).toContain("Sentry.init(");
    expect(nextConfig).toContain("withSentryConfig");
    expect(nextConfig).toContain("sourcemaps: {\n    disable: true,");
    expect(envExample).toContain("NEXT_PUBLIC_SENTRY_DSN=");
    expect(envExample).toContain("SENTRY_DSN=");
    expect(envExample).toContain("app remains fail-open when unset");
    expect(envExample).not.toMatch(/https:\/\/.+@o\d+\.ingest/);
    expect(envExample).not.toContain("SENTRY_AUTH_TOKEN=");
    expect(sharedOptions).toContain("sendDefaultPii: false");
    expect(sharedOptions).toContain("tracesSampleRate: 0");
    expect(sharedOptions).not.toContain("sendDefaultPii: true");

    for (const source of [
      instrumentation,
      clientInstrumentation,
      serverConfig,
      edgeConfig,
      nextConfig,
      sharedOptions,
    ]) {
      expect(source).not.toMatch(/https:\/\/.+@o\d+\.ingest/);
      expect(source).not.toMatch(/sntrys_/);
      expect(source).not.toContain("Sentry.setUser(");
    }
  });

  it("keeps app error recovery UX and adds root-layout coverage capture", () => {
    const errorBoundary = readSource("src/app/error.tsx");
    const globalError = readSource("src/app/global-error.tsx");

    expect(errorBoundary).toContain("onClick={() => reset()}");
    expect(errorBoundary).toContain('href="/dashboard"');
    expect(errorBoundary).toContain("Sentry.captureException(error)");
    expect(errorBoundary).toContain(
      'console.error("Nexus Pavilion application boundary:", error)',
    );
    expect(errorBoundary).not.toContain("/api/debug-sentry");
    expect(errorBoundary).not.toContain("/api/test-error");

    expect(globalError).toContain("<html lang=\"en\">");
    expect(globalError).toContain("<body");
    expect(globalError).toContain("onClick={() => reset()}");
    expect(globalError).toContain("Sentry.captureException(error)");
    expect(globalError).not.toContain("/api/debug-sentry");
    expect(globalError).not.toContain("Sentry.setUser(");
  });

  it("uses conservative privacy defaults and fail-open DSN resolution", async () => {
    const {
      getSentryErrorTrackingOptions,
      resolveSentryDsn,
    } = await import("@/lib/ops/sentry-error-tracking");

    expect(resolveSentryDsn(undefined, undefined)).toBeUndefined();
    expect(resolveSentryDsn("  ", "")).toBeUndefined();
    expect(resolveSentryDsn("https://example.ingest.sentry.io/1")).toBe(
      "https://example.ingest.sentry.io/1",
    );
    expect(
      resolveSentryDsn(undefined, "https://example.ingest.sentry.io/2"),
    ).toBe("https://example.ingest.sentry.io/2");

    const options = getSentryErrorTrackingOptions(undefined);
    expect(options.dsn).toBeUndefined();
    expect(options.tracesSampleRate).toBe(0);
    expect(options.sendDefaultPii).toBe(false);
    expect(options.enableLogs).toBe(false);
    expect(options.dataCollection.userInfo).toBe(false);
    expect(options.dataCollection.cookies).toBe(false);
    expect(options.dataCollection.httpBodies).toEqual([]);
    expect(options.dataCollection.databaseQueryData).toBe(false);
    expect(options.dataCollection.stackFrameVariables).toBe(false);
  });

  it("redacts invitation token path segments and strips query values before Sentry capture", async () => {
    const { sanitizeSentryRequestPath } = await import(
      "@/lib/ops/sentry-error-tracking"
    );
    const instrumentation = readSource("src/instrumentation.ts");

    expect(sanitizeSentryRequestPath("/rfq/invite/sensitive-token")).toBe(
      "/rfq/invite/[redacted]",
    );
    expect(sanitizeSentryRequestPath("/invite/sensitive-token")).toBe(
      "/invite/[redacted]",
    );

    const rfqWithQuery = sanitizeSentryRequestPath(
      "/rfq/invite/sensitive-token?next=/rfq/example&email=test",
    );
    expect(rfqWithQuery).toBe("/rfq/invite/[redacted]");
    expect(rfqWithQuery).not.toContain("sensitive-token");
    expect(rfqWithQuery).not.toContain("email=test");
    expect(rfqWithQuery).not.toContain("next=");

    const ordinaryWithQuery = sanitizeSentryRequestPath(
      "/api/quotes?token=sensitive&foo=bar",
    );
    expect(ordinaryWithQuery).toBe("/api/quotes");
    expect(ordinaryWithQuery).not.toContain("token=sensitive");
    expect(ordinaryWithQuery).not.toContain("foo=bar");

    expect(sanitizeSentryRequestPath("/api/quotes")).toBe("/api/quotes");

    expect(instrumentation).toContain("sanitizeSentryRequestPath(request.path)");
    expect(instrumentation).toContain("Sentry.captureRequestError(");
    expect(instrumentation).toContain("method: request.method");
    expect(instrumentation).toContain("headers: request.headers");
    expect(instrumentation).toContain("context");
  });
});

describe("Task 15-02 critical API failure visibility", () => {
  afterEach(() => {
    sentryMocks.captureMessage.mockReset();
    sentryMocks.withScope.mockClear();
    vi.restoreAllMocks();
  });

  it("builds sanitized context and excludes raw error message fields", async () => {
    const {
      buildSafeCriticalApiFailureContext,
      normalizeCriticalErrorName,
      normalizeCriticalProviderCode,
    } = await import("@/lib/ops/report-critical-api-failure");

    const error = Object.assign(new Error("SELECT * FROM secrets WHERE token='abc'"), {
      name: "PostgrestError",
      code: "PGRST116",
    });

    const context = buildSafeCriticalApiFailureContext({
      domain: "quotation",
      operation: "submit",
      failureStage: "outer_catch",
      route: "/api/quotes?token=sensitive",
      method: "post",
      error,
    });

    expect(context.route).toBe("/api/quotes");
    expect(context.method).toBe("POST");
    expect(context.domain).toBe("quotation");
    expect(context.operation).toBe("submit");
    expect(context.failure_stage).toBe("outer_catch");
    expect(context.error_name).toBe("PostgrestError");
    expect(context.provider_code).toBe("PGRST116");
    expect(JSON.stringify(context)).not.toContain("SELECT");
    expect(JSON.stringify(context)).not.toContain("token");
    expect(JSON.stringify(context)).not.toContain("secrets");
    expect(Object.keys(context).sort()).toEqual([
      "domain",
      "error_name",
      "failure_stage",
      "method",
      "operation",
      "provider_code",
      "route",
    ]);

    expect(normalizeCriticalErrorName(error)).toBe("PostgrestError");
    expect(
      normalizeCriticalProviderCode({
        code: "this is arbitrary provider prose that must be rejected",
      }),
    ).toBeNull();
    expect(normalizeCriticalProviderCode({ code: "42501" })).toBe("42501");
  });

  it("reports via captureMessage and safe console without serializing the error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { reportCriticalApiFailure } = await import(
      "@/lib/ops/report-critical-api-failure"
    );

    const sensitive = Object.assign(new Error("leak-me-please"), {
      name: "DatabaseError",
      code: "XX000",
      details: "email=buyer@example.com cookie=abc",
    });

    reportCriticalApiFailure({
      domain: "contract_award",
      operation: "award",
      failureStage: "outer_catch",
      route: "/api/award-contract",
      method: "POST",
      error: sensitive,
    });

    expect(sentryMocks.withScope).toHaveBeenCalledTimes(1);
    expect(sentryMocks.captureMessage).toHaveBeenCalledWith(
      "Critical API failure: contract_award.award",
      "error",
    );

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError.mock.calls[0]?.[0]).toBe("[critical-api-failure]");
    const logged = consoleError.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(logged).toMatchObject({
      domain: "contract_award",
      operation: "award",
      failure_stage: "outer_catch",
      route: "/api/award-contract",
      method: "POST",
      error_name: "DatabaseError",
      provider_code: "XX000",
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("leak-me-please");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("buyer@example.com");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("cookie=");
  });

  it("remains fail-open when Sentry capture throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    sentryMocks.withScope.mockImplementationOnce(() => {
      throw new Error("sentry-unavailable");
    });

    const { reportCriticalApiFailure } = await import(
      "@/lib/ops/report-critical-api-failure"
    );

    expect(() =>
      reportCriticalApiFailure({
        domain: "contact",
        operation: "submit",
        failureStage: "outer_catch",
        route: "/api/contact",
        method: "POST",
        error: new Error("boom"),
      }),
    ).not.toThrow();

    expect(consoleError).toHaveBeenCalledWith(
      "[critical-api-failure]",
      expect.objectContaining({
        domain: "contact",
        operation: "submit",
      }),
    );
  });

  it("wires reportCriticalApiFailure into representative critical routes without raw outer catch dumps", () => {
    const quotes = readSource("src/app/api/quotes/route.ts");
    const award = readSource("src/app/api/award-contract/route.ts");
    const invites = readSource("src/app/api/invites/route.ts");
    const addenda = readSource("src/app/api/rfq-addenda/route.ts");
    const companyCreate = readSource("src/app/api/companies/create/route.ts");
    const helper = readSource("src/lib/ops/report-critical-api-failure.ts");

    expect(helper).toContain('import "server-only"');
    expect(helper).toContain("sanitizeSentryRequestPath");
    expect(helper).toContain("Sentry.captureMessage");
    expect(helper).not.toContain("Sentry.captureException");
    expect(helper).not.toContain("Sentry.setUser");
    expect(helper).not.toContain("error.message");

    for (const [source, domain] of [
      [quotes, "quotation"],
      [award, "contract_award"],
      [invites, "rfq_invitation"],
      [addenda, "addendum"],
      [companyCreate, "company_workspace"],
    ] as const) {
      expect(source).toContain("reportCriticalApiFailure");
      expect(source).toContain(`domain: "${domain}"`);
    }

    expect(quotes).toContain('{ error: "Internal server error" }');
    expect(quotes).toContain("{ status: 500 }");
    expect(award).toContain('{ error: "Internal server error." }');
    expect(invites).toContain('{ error: "Server error." }');
    expect(companyCreate).toContain('{ error: "Internal server error." }');

    expect(quotes).not.toMatch(/} catch \(error\) \{\s*console\.error\(error\);/);
    expect(award).not.toContain('console.error("Award contract route failed:", error)');
    expect(invites).not.toMatch(/} catch \(error\) \{\s*console\.error\(error\);/);
    expect(companyCreate).not.toContain(
      "Unexpected company creation route failure.",
    );

    expect(quotes).toContain("{ status: 403 }");
    expect(quotes).not.toMatch(
      /status:\s*403[\s\S]{0,80}reportCriticalApiFailure/,
    );
  });

  it("instruments companies/create mid-route caught 5xx failures with stable create_company operation", () => {
    const companyCreate = readSource("src/app/api/companies/create/route.ts");

    expect(companyCreate).toContain('operation: "create_company"');
    expect(companyCreate).not.toContain('operation: "create"');

    for (const stage of [
      "profile_lookup",
      "owned_company_lookup",
      "professional_name_sync",
      "existing_company_recovery",
      "company_insert",
      "company_result_missing",
      "workspace_bootstrap",
      "outer_catch",
    ]) {
      expect(companyCreate).toContain(`failureStage: "${stage}"`);
    }

    expect(companyCreate).toContain("{ error: WORKSPACE_ELIGIBILITY_ERROR }");
    expect(companyCreate).toContain("{ error: WORKSPACE_CREATE_FAILED_ERROR }");
    expect(companyCreate).toContain(
      "{ error: WORKSPACE_BOOTSTRAP_INCOMPLETE_ERROR }",
    );
    expect(companyCreate).toContain('{ error: "Internal server error." }');
    expect(companyCreate).toContain("{ status: 500 }");

    expect(companyCreate).not.toContain("profile lookup could not be completed.");
    expect(companyCreate).not.toContain(
      "owned-company lookup could not be completed.",
    );
    expect(companyCreate).not.toContain(
      "owned company could not be recovered.",
    );
    expect(companyCreate).not.toContain("company record was not created.");
    expect(companyCreate).not.toContain(
      "owned-company identity was not established.",
    );

    const helperCalls = [
      ...companyCreate.matchAll(
        /reportCriticalApiFailure\(\{([\s\S]*?)\}\);/g,
      ),
    ];
    expect(helperCalls.length).toBeGreaterThanOrEqual(8);
    for (const call of helperCalls) {
      expect(call[1]).toContain('domain: "company_workspace"');
      expect(call[1]).toContain('operation: "create_company"');
      expect(call[1]).not.toMatch(/\buserId\b/);
      expect(call[1]).not.toMatch(/\bcompanyId\b/);
      expect(call[1]).not.toMatch(/\bemail\b/);
    }

    expect(companyCreate).toContain("{ status: 409 }");
    expect(companyCreate).toContain("{ status: 401 }");
    expect(companyCreate).toContain("{ status: 400 }");
    expect(companyCreate).not.toMatch(
      /status:\s*409[\s\S]{0,120}reportCriticalApiFailure/,
    );
    expect(companyCreate).not.toMatch(
      /status:\s*401[\s\S]{0,120}reportCriticalApiFailure/,
    );
  });
});

describe("Task 15-05 invitation diagnostics", () => {
  it("separates bounded 403 diagnostics from critical invitation failures", () => {
    const cases = [
      {
        source: readSource("src/app/api/company-invitations/route.ts"),
        operation: "create",
        route: "/api/company-invitations",
        criticalStages: [
          "create_invitation_rpc",
          "invitation_token_missing",
          "outer_catch",
        ],
      },
      {
        source: readSource(
          "src/app/api/company-invitations/resend/route.ts",
        ),
        operation: "resend",
        route: "/api/company-invitations/resend",
        criticalStages: ["invitation_lookup_rpc", "outer_catch"],
      },
      {
        source: readSource(
          "src/app/api/company-invitations/revoke/route.ts",
        ),
        operation: "revoke",
        route: "/api/company-invitations/revoke",
        criticalStages: ["revoke_invitation_rpc", "outer_catch"],
      },
    ] as const;

    for (const { source, operation, route, criticalStages } of cases) {
      const criticalCalls = [
        ...source.matchAll(/reportCriticalApiFailure\(\{([\s\S]*?)\}\);/g),
      ].map((match) => match[1] ?? "");

      expect(criticalCalls.length).toBeGreaterThan(0);

      for (const stage of criticalStages) {
        expect(
          criticalCalls.some((payload) =>
            payload.includes(`failureStage: "${stage}"`),
          ),
        ).toBe(true);
      }

      for (const payload of criticalCalls) {
        expect(payload).toContain('domain: "workspace_invitation"');
        expect(payload).toContain(`operation: "${operation}"`);
        expect(payload).toContain(`route: "${route}"`);
        expect(payload).toContain('method: "POST"');
        expect(payload).not.toContain(
          'failureStage: "workspace_context_lookup"',
        );
      }

      const workspaceWarnings = [
        ...source.matchAll(
          /console\.warn\(\s*"\[workspace-invitation-diagnostic\]",\s*buildSafeCriticalApiFailureContext\(\{([\s\S]*?)\}\),\s*\);/g,
        ),
      ];

      expect(workspaceWarnings).toHaveLength(1);

      const workspacePayload = workspaceWarnings[0]?.[1] ?? "";

      expect(workspacePayload).toContain(
        'domain: "workspace_invitation"',
      );
      expect(workspacePayload).toContain(`operation: "${operation}"`);
      expect(workspacePayload).toContain(
        'failureStage: "workspace_context_lookup"',
      );
      expect(workspacePayload).toContain(`route: "${route}"`);
      expect(workspacePayload).toContain('method: "POST"');

      expect(workspacePayload).not.toMatch(/\bemail\b/);
      expect(workspacePayload).not.toMatch(/\brecipient\b/);
      expect(workspacePayload).not.toMatch(/\binviteUrl\b/);
      expect(workspacePayload).not.toMatch(/\binvite_url\b/);
      expect(workspacePayload).not.toMatch(/\buserId\b/);
      expect(workspacePayload).not.toMatch(/\bcompanyId\b/);
      expect(workspacePayload).not.toMatch(/\bauthorization\b/i);
      expect(workspacePayload).not.toMatch(/\brequestBody\b/);

      expect(source).not.toContain("console.error(");
    }
  });

  it("keeps critical workspace invitation diagnostics free of sensitive invitation context", () => {
    const sources = [
      readSource("src/app/api/company-invitations/route.ts"),
      readSource("src/app/api/company-invitations/resend/route.ts"),
      readSource("src/app/api/company-invitations/revoke/route.ts"),
    ];

    for (const source of sources) {
      const helperCalls = [
        ...source.matchAll(/reportCriticalApiFailure\(\{([\s\S]*?)\}\);/g),
      ];

      expect(helperCalls.length).toBeGreaterThan(0);

      for (const call of helperCalls) {
        const payload = call[1] ?? "";

        expect(payload).not.toMatch(/\bemail\b/);
        expect(payload).not.toMatch(/\brecipient\b/);
        expect(payload).not.toMatch(/\binviteUrl\b/);
        expect(payload).not.toMatch(/\binvite_url\b/);
        expect(payload).not.toMatch(/\buserId\b/);
        expect(payload).not.toMatch(/\bcompanyId\b/);
        expect(payload).not.toMatch(/\bauthorization\b/i);
        expect(payload).not.toMatch(/\brequestBody\b/);
      }
    }
  });
});
describe("Task 15-03 migration discipline", () => {
  const migrationsDir = resolve(process.cwd(), "supabase/migrations");
  const archiveV2Dir = resolve(
    process.cwd(),
    "supabase/legacy-migrations/pre-baseline-v2",
  );
  const baselineV2Name =
    "20260911000000_launch_candidate_baseline_v2.sql";
  const historicalSurgeryName =
    "20260904204031_populate_notification_rfq_source_from_trusted_writers.sql";

  function migrationFilenames() {
    return readdirSync(migrationsDir).filter((name) => name.endsWith(".sql"));
  }

  function archiveV2Filenames() {
    return readdirSync(archiveV2Dir).filter((name) => name.endsWith(".sql"));
  }

  it("keeps Canonical Baseline V2 as the only active migration", () => {
    expect(migrationFilenames()).toEqual([baselineV2Name]);

    const baseline = readSource(`supabase/migrations/${baselineV2Name}`);
    const compact = baseline.replace(/\s+/g, " ");

    expect(compact.toLowerCase()).toContain("insert into storage.buckets");
    expect(compact).toContain("'Company-logos'");
    expect(compact).toContain("public = true");
    expect(compact).toContain("5242880");
    expect(compact).toContain("'image/jpeg'");
    expect(compact).toContain("'image/png'");
    expect(compact).toContain("'image/webp'");
    expect(baseline).not.toContain(
      "record_procurement_activity definition changed after 8-10 review",
    );
    expect(baseline).not.toContain("30dfff294c0cfe2151456ac1d18c558e");
    expect(baseline).not.toMatch(/md5\(\s*v_(?:proc|award)\s*\)\s*<>/i);
    expect(baseline).toContain("DO NOT push this baseline SQL to linked active-dev");
  });

  it("archives the prior 33-file chain including immutable 20260904204031", () => {
    const archived = archiveV2Filenames();

    expect(archived).toHaveLength(33);
    expect(archived).toContain(historicalSurgeryName);
    expect(archived).toContain(
      "20260822000000_dev_public_baseline.sql",
    );
    expect(archived).toContain(
      "20260909090225_harden_rfq_addendum_acknowledgement_terminal_state.sql",
    );
    expect(migrationFilenames()).not.toContain(historicalSurgeryName);

    for (const legacyPrefix of [
      "20260831065829",
      "20260831070207",
      "20260831070506",
      "20260831143650",
    ]) {
      expect(
        migrationFilenames().some((name) => name.startsWith(legacyPrefix)),
        `unexpected active legacy migration file prefix ${legacyPrefix}`,
      ).toBe(false);
    }
  });

  it("documents Baseline V2 cutover, archive range, and Production ledger state", () => {
    const runbook = readSource("docs/operations/LAUNCH_OPERATIONS_RUNBOOK.md");

    expect(runbook).toContain("nexus-pavilion-dev");
    expect(runbook).toContain("bzntqnwoytdakmstbtyh");
    expect(runbook).toContain("DEVELOPMENT / LAUNCH-CANDIDATE BACKEND");
    expect(runbook).toContain("NO VERIFIED PRODUCTION MIGRATIONS EXECUTED");

    expect(runbook).toContain(
      "20260911000000_launch_candidate_baseline_v2.sql",
    );
    expect(runbook).toContain(
      "supabase/legacy-migrations/pre-baseline-v2/",
    );
    expect(runbook).toContain("20260822000000");
    expect(runbook).toContain("20260909090225");
    expect(runbook).toContain("20260904204031");
    expect(runbook).toContain("immutable historical evidence");
    expect(runbook).not.toContain("NOT yet been normalized");
    expect(runbook).toContain("no longer active-dev ledger rows");
    expect(runbook).toContain("remote ledger contains only");
    expect(runbook).toContain(
      "20260911000000 | launch_candidate_baseline_v2",
    );
    expect(runbook).toContain("11/11 fingerprint categories MATCH");
    expect(runbook).toContain("metadata-only");
    expect(runbook).toContain("MUST NOT be pushed to active-dev");

    expect(runbook).toContain("forward corrective migration");
    expect(runbook).toContain("migration repair");
    expect(runbook).toContain("does **not** reverse SQL");
    expect(runbook).toContain("Product Owner / ChatGPT gated");
    expect(runbook).toContain("Company-logos");
    expect(runbook).toContain("APPLICATION ROLLBACK");
    expect(runbook).toContain("FORWARD DATABASE CORRECTION");
    expect(runbook).toContain("DATA RECOVERY");
    expect(runbook).toContain("MIGRATION HISTORY REPAIR");
    expect(runbook).toContain("Production Migration Ledger");
    expect(runbook).toContain("Migration discipline and history reconciliation");
    expect(runbook).toContain("15-07");
    expect(runbook).toContain("15-08");
    expect(runbook).toContain("15-09");
  });
});
describe("Task 15-07 deployment rollback procedure", () => {
  it("keeps an executable application rollback procedure in the launch runbook", () => {
    const runbook = readSource(
      "docs/operations/LAUNCH_OPERATIONS_RUNBOOK.md",
    );

    const startMarker = "## 2. Application rollback (Task 15-07)";
    const endMarker = "## 3. Database migration rollback";

    const start = runbook.indexOf(startMarker);
    const end = runbook.indexOf(
      endMarker,
      start + startMarker.length,
    );

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const rollbackSection = runbook.slice(start, end);

    expect(rollbackSection).toContain("### Operator rollback procedure");
    expect(rollbackSection).toContain("Freeze promotion");
    expect(rollbackSection).toContain("Record the bad deployment");
    expect(rollbackSection).toContain("known-good rollback SHA");
    expect(rollbackSection).toContain("deployment host history");
    expect(rollbackSection).toContain(
      "Check database compatibility before rollback",
    );
    expect(rollbackSection).toContain(
      "Product Owner rollback authorization",
    );
    expect(rollbackSection).toContain(
      "Restore the known-good deployment",
    );
    expect(rollbackSection).toContain(
      "Verify the restored revision",
    );
    expect(rollbackSection).toContain("Record rollback evidence");

    expect(rollbackSection).toContain("/api/health");
    expect(rollbackSection).toContain("commitSha");
    expect(rollbackSection).toContain("login");
    expect(rollbackSection).toContain("RFQ read");
    expect(rollbackSection).toContain("non-destructive");
    expect(rollbackSection).toContain(
      "Application rollback does **not** reverse SQL",
    );

    expect(rollbackSection).toContain(
      "does not assert backup/PITR capability",
    );
    expect(rollbackSection).toMatch(
      /does not\s+perform the Task 15-09 environment variable audit/,
    );
  });
});
