import { describe, expect, it } from "vitest";

import type { ProjectRecord } from "@/lib/projects/project-contract";
import { buildProjectInsights } from "@/lib/projects/project-insights";

function project(
  id: string,
  overrides: Partial<ProjectRecord> = {},
): ProjectRecord {
  return {
    id,
    companyId: "company-1",
    createdBy: "user-1",
    name: `Project ${id}`,
    projectCode: `P-${id}`,
    ownerClient: null,
    location: null,
    createdAt: "2026-09-01T12:00:00.000Z",
    updatedAt: "2026-09-01T12:00:00.000Z",
    procurementAssociations: [],
    ...overrides,
  };
}

describe("Project Insights", () => {
  it("returns explicit insufficient-data states for an empty Project portfolio", () => {
    const insights = buildProjectInsights([]);

    expect(insights.availability).toBe("insufficient_data");
    expect(insights.totalProjects).toBe(0);
    expect(insights.identifierCoverage).toMatchObject({
      numerator: 0,
      denominator: 0,
      percentage: null,
      availability: "insufficient_data",
    });
    expect(insights.associationCoverage).toMatchObject({
      numerator: 0,
      denominator: 0,
      percentage: null,
      availability: "insufficient_data",
    });
    expect(insights.linkedProcurementAvailability).toBe("insufficient_data");
  });

  it("uses explicit Project and association denominators without excluding identifier gaps", () => {
    const insights = buildProjectInsights([
      project("1", {
        projectCode: "  P-001  ",
        procurementAssociations: [
          {
            id: "rfq-1",
            slug: "rfq-1",
            title: "Open RFQ",
            status: "open",
            awardedAt: null,
          },
          {
            id: "rfq-2",
            slug: "rfq-2",
            title: "Awarded RFQ",
            status: "awarded",
            awardedAt: "2026-09-04T12:00:00.000Z",
          },
        ],
      }),
      project("2", {
        projectCode: null,
      }),
      project("3", {
        projectCode: "P-003",
        procurementAssociations: [
          {
            id: "rfq-3",
            slug: "rfq-3",
            title: "Award Status Without Award Date",
            status: "awarded",
            awardedAt: null,
          },
        ],
      }),
    ]);

    expect(insights.availability).toBe("limited");
    expect(insights.totalProjects).toBe(3);
    expect(insights.identifiableProjectCount).toBe(2);
    expect(insights.identifierGapCount).toBe(1);
    expect(insights.linkedProjectCount).toBe(2);
    expect(insights.linkedRfqCount).toBe(3);
    expect(insights.openLinkedRfqCount).toBe(1);
    expect(insights.verifiedAwardedRfqCount).toBe(1);
    expect(insights.linkedProcurementAvailability).toBe("limited");

    expect(insights.identifierCoverage).toMatchObject({
      numerator: 2,
      denominator: 3,
      percentage: 66.7,
      availability: "limited",
    });
    expect(insights.associationCoverage).toMatchObject({
      numerator: 2,
      denominator: 2,
      percentage: 100,
      availability: "limited",
    });
  });

  it("requires both awarded status and awardedAt for verified award evidence", () => {
    const insights = buildProjectInsights([
      project("1", {
        procurementAssociations: [
          {
            id: "rfq-1",
            slug: "rfq-1",
            title: "Incomplete Award Evidence",
            status: "awarded",
            awardedAt: null,
          },
          {
            id: "rfq-2",
            slug: "rfq-2",
            title: "Verified Award Evidence",
            status: "awarded",
            awardedAt: "2026-09-04T12:00:00.000Z",
          },
        ],
      }),
    ]);

    expect(insights.verifiedAwardedRfqCount).toBe(1);
    expect(insights.availability).toBe("available");
    expect(insights.linkedProcurementAvailability).toBe("available");
  });

  it("does not convert zero linked RFQs into a false positive evidence state", () => {
    const insights = buildProjectInsights([project("1"), project("2")]);

    expect(insights.associationCoverage).toMatchObject({
      numerator: 0,
      denominator: 2,
      percentage: 0,
      availability: "available",
    });
    expect(insights.linkedRfqCount).toBe(0);
    expect(insights.linkedProcurementAvailability).toBe("insufficient_data");
  });
});
