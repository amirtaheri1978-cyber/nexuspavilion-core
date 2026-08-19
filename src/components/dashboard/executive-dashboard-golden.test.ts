import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CTA_SECONDARY,
  EXECUTIVE_PAGE_CLASS,
} from "@/lib/design-system/executive-contract";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const dashboardFiles = [
  "src/app/dashboard/page.tsx",
  "src/app/dashboard/loading.tsx",
  "src/components/dashboard/executive-hero.tsx",
  "src/components/dashboard/executive-attention-strip.tsx",
  "src/components/dashboard/executive-kpi-row.tsx",
  "src/components/dashboard/executive-decision-workspace.tsx",
  "src/components/dashboard/strategic-intelligence-workspace.tsx",
  "src/components/dashboard/procurement-operations-workspace.tsx",
  "src/components/dashboard/governance-reference-workspace.tsx",
];

const page = readSource("src/app/dashboard/page.tsx");
const hero = readSource("src/components/dashboard/executive-hero.tsx");
const loading = readSource("src/app/dashboard/loading.tsx");
const kpi = readSource("src/components/dashboard/executive-kpi-row.tsx");
const attention = readSource(
  "src/components/dashboard/executive-attention-strip.tsx",
);
const decision = readSource(
  "src/components/dashboard/executive-decision-workspace.tsx",
);

describe("NP-MASTER-22-B02 golden executive dashboard", () => {
  it("applies the frozen page contract", () => {
    expect(page).toContain("EXECUTIVE_PAGE_CLASS");
    expect(page).toContain("bg-nexus-navy");
    expect(page).not.toContain("max-w-none");
    expect(page).not.toContain("bg-[#030712]");
    expect(EXECUTIVE_PAGE_CLASS).toContain("np-page");
    expect(loading).toContain("EXECUTIVE_PAGE_CLASS");
  });

  it("keeps a single page h1 in the dashboard hero", () => {
    expect(hero.match(/<h1[\s>]/g) || []).toHaveLength(1);
    expect(hero).toContain("np-type-h1");

    for (const file of dashboardFiles.filter(
      (path) => path !== "src/components/dashboard/executive-hero.tsx",
    )) {
      expect(readSource(file)).not.toMatch(/<h1[\s>]/);
    }
  });

  it("uses frozen CTA and focus classes without hover-scale", () => {
    expect(hero).toContain("EXECUTIVE_CTA_PRIMARY");
    expect(hero).toContain("EXECUTIVE_CTA_SECONDARY");
    expect(EXECUTIVE_CTA_PRIMARY).toContain("focus-visible:ring-2");
    expect(EXECUTIVE_CTA_SECONDARY).toContain("focus-visible:ring-2");
    expect(EXECUTIVE_CTA_PRIMARY).not.toContain("hover:scale");
    expect(EXECUTIVE_CTA_PRIMARY).not.toContain("hover:-translate");
    expect(hero).not.toContain("hover:scale");
    expect(hero).not.toContain("hover:-translate");
  });

  it("does not reintroduce the light-mode ui kit", () => {
    for (const file of dashboardFiles) {
      const source = readSource(file);
      expect(source).not.toContain('@/components/ui');
      expect(source).not.toContain("src/components/ui");
      expect(source).not.toContain("bg-[#f6f6f3]");
    }
  });

  it("does not fabricate metric trend copy", () => {
    for (const file of dashboardFiles) {
      const source = readSource(file);
      expect(source).not.toMatch(/vs last (month|week|quarter)/i);
      expect(source).not.toMatch(/year over year/i);
      expect(source).not.toMatch(/\+\d+%/);
    }

    expect(kpi).toContain("Values are not compared against prior periods");
    expect(page).toContain("Insufficient Data");
  });

  it("keeps bounded empty and loading states", () => {
    expect(attention).toContain("No Immediate Action");
    expect(attention).toContain("border-dashed");
    expect(decision).toContain("No Priority Queue");
    expect(
      readSource("src/components/dashboard/procurement-operations-workspace.tsx"),
    ).toContain("No award decisions have been recorded.");
    expect(
      readSource("src/components/dashboard/governance-reference-workspace.tsx"),
    ).toContain("No recent workspace activity.");
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain("Loading executive dashboard");
  });

  it("does not add backend queries for appearance", () => {
    expect(page).toContain('.from("rfqs")');
    expect(page).toContain('.from("quotes")');
    expect(page).toContain('.from("notifications")');
    expect(page).not.toContain("createBrowserClient");
    expect(page.match(/\.from\("/g) || []).toHaveLength(5);
  });
});
