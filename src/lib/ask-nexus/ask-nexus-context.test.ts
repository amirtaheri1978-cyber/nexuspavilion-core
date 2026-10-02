import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  resolveAskNexusAuthorizedContext,
} from "@/lib/ask-nexus/ask-nexus-context";

const contextSource = readFileSync(
  resolve(process.cwd(), "src/lib/ask-nexus/ask-nexus-context.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("ask nexus authorized context", () => {
  it("retains authorized company context", () => {
    const result = resolveAskNexusAuthorizedContext({
      company: { id: "company-1", label: " Northline " },
      authorizedDomains: ["company"],
    });

    expect(result.company).toEqual({
      id: "company-1",
      label: "Northline",
    });
    expect(result.authorizedDomains).toEqual(["company"]);
  });

  it("drops company context when company is not authorized", () => {
    const result = resolveAskNexusAuthorizedContext({
      company: { id: "company-1", label: "Northline" },
      authorizedDomains: ["rfq"],
    });

    expect(result.company).toBeNull();
    expect(result.authorizedDomains).toEqual(["rfq"]);
  });

  it("retains authorized project context independently", () => {
    const result = resolveAskNexusAuthorizedContext({
      project: { id: "project-1", label: "Harbor Point" },
      authorizedDomains: ["project"],
    });

    expect(result.project).toEqual({
      id: "project-1",
      label: "Harbor Point",
    });
    expect(result.company).toBeNull();
    expect(result.rfq).toBeNull();
  });

  it("retains authorized RFQ context independently", () => {
    const result = resolveAskNexusAuthorizedContext({
      rfq: {
        id: "rfq-1",
        label: "Harbor Point RFQ",
        authorizedHref: " /rfq/harbor-point ",
      },
      authorizedDomains: ["rfq"],
    });

    expect(result.rfq).toEqual({
      id: "rfq-1",
      label: "Harbor Point RFQ",
      authorizedHref: "/rfq/harbor-point",
    });
    expect(result.company).toBeNull();
    expect(result.project).toBeNull();
  });

  it("does not let company authorization imply project or RFQ access", () => {
    const result = resolveAskNexusAuthorizedContext({
      company: { id: "company-1", label: "Northline" },
      project: { id: "project-1", label: "Campus" },
      rfq: { id: "rfq-1", label: "Package" },
      authorizedDomains: ["company"],
    });

    expect(result.company?.id).toBe("company-1");
    expect(result.project).toBeNull();
    expect(result.rfq).toBeNull();
  });

  it("does not let project authorization imply RFQ or company access", () => {
    const result = resolveAskNexusAuthorizedContext({
      company: { id: "company-1", label: "Northline" },
      project: { id: "project-1", label: "Campus" },
      rfq: { id: "rfq-1", label: "Package" },
      authorizedDomains: ["project"],
    });

    expect(result.project?.id).toBe("project-1");
    expect(result.company).toBeNull();
    expect(result.rfq).toBeNull();
  });

  it("does not let RFQ authorization imply company or project access", () => {
    const result = resolveAskNexusAuthorizedContext({
      company: { id: "company-1", label: "Northline" },
      project: { id: "project-1", label: "Campus" },
      rfq: { id: "rfq-1", label: "Package" },
      authorizedDomains: ["rfq"],
    });

    expect(result.rfq?.id).toBe("rfq-1");
    expect(result.company).toBeNull();
    expect(result.project).toBeNull();
  });

  it("preserves caller-supplied RFQ href exactly after trim", () => {
    const href = "/rfq/architectural-curtain-wall-building-envelope-package-1787506124486";
    const result = resolveAskNexusAuthorizedContext({
      rfq: {
        id: "rfq-2",
        label: "Envelope",
        authorizedHref: `  ${href}  `,
      },
      authorizedDomains: ["rfq"],
    });

    expect(result.rfq?.authorizedHref).toBe(href);
  });

  it("does not synthesize a route when RFQ href is absent", () => {
    const result = resolveAskNexusAuthorizedContext({
      rfq: {
        id: "rfq-3",
        label: "Envelope",
      },
      authorizedDomains: ["rfq"],
    });

    expect(result.rfq).toEqual({
      id: "rfq-3",
      label: "Envelope",
      authorizedHref: null,
    });
    expect(contextSource).not.toContain('"/rfq/');
    expect(contextSource).not.toContain("'/rfq/");
    expect(contextSource).not.toContain("`/rfq/");
    expect(contextSource).not.toContain("encodeURIComponent");
    expect(contextSource).not.toContain("joinPublicSitePath");
  });

  it("invalidates resources with empty IDs", () => {
    const result = resolveAskNexusAuthorizedContext({
      company: { id: "   ", label: "Northline" },
      project: { id: "", label: "Campus" },
      rfq: { id: "\t", label: "Package", authorizedHref: "/rfq/x" },
      authorizedDomains: ["company", "project", "rfq"],
    });

    expect(result.company).toBeNull();
    expect(result.project).toBeNull();
    expect(result.rfq).toBeNull();
  });

  it("normalizes empty labels safely", () => {
    const result = resolveAskNexusAuthorizedContext({
      pageLabel: "  ",
      workflowLabel: "\n",
      company: { id: "company-1", label: "   " },
      authorizedDomains: ["company"],
    });

    expect(result.pageLabel).toBeNull();
    expect(result.workflowLabel).toBeNull();
    expect(result.company).toEqual({
      id: "company-1",
      label: null,
    });
  });

  it("normalizes facts and removes empty items", () => {
    const result = resolveAskNexusAuthorizedContext({
      authorizedDomains: ["company"],
      facts: [
        { key: " status ", label: " Status ", value: " Open " },
        { key: " ", label: "Empty key", value: "x" },
        { key: "empty-label", label: "  ", value: "x" },
        { key: "empty-value", label: "Label", value: "" },
      ],
    });

    expect(result.facts).toEqual([
      { key: "status", label: "Status", value: "Open" },
    ]);
  });

  it("preserves the first occurrence when fact keys duplicate", () => {
    const result = resolveAskNexusAuthorizedContext({
      authorizedDomains: ["rfq"],
      facts: [
        { key: "deadline", label: "Deadline", value: "First" },
        { key: "deadline", label: "Deadline", value: "Second" },
      ],
    });

    expect(result.facts).toEqual([
      { key: "deadline", label: "Deadline", value: "First" },
    ]);
  });

  it("does not let facts create authorized domains", () => {
    const result = resolveAskNexusAuthorizedContext({
      company: { id: "company-1", label: "Northline" },
      project: { id: "project-1", label: "Campus" },
      rfq: { id: "rfq-1", label: "Package" },
      facts: [
        { key: "company", label: "Company", value: "company-1" },
        { key: "project", label: "Project", value: "project-1" },
        { key: "rfq", label: "RFQ", value: "rfq-1" },
      ],
      authorizedDomains: [],
    });

    expect(result.authorizedDomains).toEqual([]);
    expect(result.company).toBeNull();
    expect(result.project).toBeNull();
    expect(result.rfq).toBeNull();
    expect(result.facts).toHaveLength(3);
  });

  it("deduplicates authorizedDomains and ignores unknown domains", () => {
    const result = resolveAskNexusAuthorizedContext({
      company: { id: "company-1", label: "Northline" },
      authorizedDomains: [
        "company",
        "company",
        "rfq",
        "unknown" as "company",
      ],
    });

    expect(result.authorizedDomains).toEqual(["company", "rfq"]);
  });

  it("contains no data-access, API, router, or AI imports", () => {
    expect(contextSource).not.toContain("from \"@/lib/supabase");
    expect(contextSource).not.toContain("from '@supabase");
    expect(contextSource).not.toContain("createClient");
    expect(contextSource).not.toContain("fetch(");
    expect(contextSource).not.toContain("next/navigation");
    expect(contextSource).not.toContain("useRouter");
    expect(contextSource).not.toContain("openai");
    expect(contextSource).not.toContain("@/lib/ai");
    expect(contextSource).not.toContain("from \"next/");
  });

  it("contains no role or procurement-function inference", () => {
    expect(contextSource).not.toContain("procurement_function");
    expect(contextSource).not.toContain("procurementFunction");
    expect(contextSource).not.toContain("workspace role");
    expect(contextSource).not.toContain("profile.role");
    expect(contextSource).not.toContain("membership_type");
    expect(contextSource).not.toMatch(/\brole\b/);
  });

  it("exposes no permission or execution fields", () => {
    expect(contextSource).not.toContain("permissionGranted");
    expect(contextSource).not.toContain("canAward");
    expect(contextSource).not.toContain("canSubmit");
    expect(contextSource).not.toContain("canPublish");
    expect(contextSource).not.toContain("canManage");
    expect(contextSource).not.toContain("approval");
    expect(contextSource).not.toContain("eligible_for_authorized_execution");
    expect(contextSource).not.toContain("requiresExecutionRevalidation");
  });

  it("does not import broad repositories or authorization modules", () => {
    expect(contextSource).not.toContain("workspace-context");
    expect(contextSource).not.toContain("procurement-context-repository");
    expect(contextSource).not.toContain("workspace-permissions");
    expect(contextSource).not.toContain("procurement-write-authorization");
    expect(contextSource).not.toContain("ask-nexus-trust-policy");
  });
});
