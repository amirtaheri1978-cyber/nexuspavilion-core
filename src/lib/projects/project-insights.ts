import type { ProjectRecord } from "@/lib/projects/project-contract";

export type ProjectInsightAvailability =
  | "insufficient_data"
  | "limited"
  | "available";

export type ProjectInsightRatio = {
  numerator: number;
  denominator: number;
  percentage: number | null;
  availability: ProjectInsightAvailability;
  definition: string;
  limitation: string;
};

export type ProjectInsights = {
  availability: ProjectInsightAvailability;
  totalProjects: number;
  identifiableProjectCount: number;
  identifierGapCount: number;
  linkedProjectCount: number;
  linkedRfqCount: number;
  openLinkedRfqCount: number;
  verifiedAwardedRfqCount: number;
  linkedProcurementAvailability: ProjectInsightAvailability;
  identifierCoverage: ProjectInsightRatio;
  associationCoverage: ProjectInsightRatio;
  limitations: string[];
};

function hasProjectIdentifier(project: ProjectRecord) {
  return Boolean(project.projectCode?.trim());
}

function isOpenAssociation(status: string) {
  return status.trim().toLowerCase() === "open";
}

function isVerifiedAwardAssociation(status: string, awardedAt: string | null) {
  return (
    status.trim().toLowerCase() === "awarded" &&
    Boolean(awardedAt?.trim())
  );
}

function percentage(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function buildRatio({
  numerator,
  denominator,
  availability,
  definition,
  limitation,
}: {
  numerator: number;
  denominator: number;
  availability: ProjectInsightAvailability;
  definition: string;
  limitation: string;
}): ProjectInsightRatio {
  if (denominator <= 0) {
    return {
      numerator,
      denominator,
      percentage: null,
      availability: "insufficient_data",
      definition,
      limitation,
    };
  }

  return {
    numerator,
    denominator,
    percentage: percentage(numerator, denominator),
    availability,
    definition,
    limitation,
  };
}

export function buildProjectInsights(projects: ProjectRecord[]): ProjectInsights {
  const totalProjects = projects.length;
  const identifiableProjects = projects.filter(hasProjectIdentifier);
  const identifiableProjectCount = identifiableProjects.length;
  const identifierGapCount = totalProjects - identifiableProjectCount;

  const linkedProjects = identifiableProjects.filter(
    (project) => project.procurementAssociations.length > 0,
  );
  const linkedProjectCount = linkedProjects.length;

  const associations = identifiableProjects.flatMap(
    (project) => project.procurementAssociations,
  );
  const linkedRfqCount = associations.length;
  const openLinkedRfqCount = associations.filter((association) =>
    isOpenAssociation(association.status),
  ).length;
  const verifiedAwardedRfqCount = associations.filter((association) =>
    isVerifiedAwardAssociation(association.status, association.awardedAt),
  ).length;

  const availability: ProjectInsightAvailability =
    totalProjects === 0
      ? "insufficient_data"
      : identifierGapCount > 0
        ? "limited"
        : "available";

  const linkedProcurementAvailability: ProjectInsightAvailability =
    linkedRfqCount === 0
      ? "insufficient_data"
      : identifierGapCount > 0
        ? "limited"
        : "available";

  const measurableAvailability: ProjectInsightAvailability =
    identifierGapCount > 0 ? "limited" : "available";

  return {
    availability,
    totalProjects,
    identifiableProjectCount,
    identifierGapCount,
    linkedProjectCount,
    linkedRfqCount,
    openLinkedRfqCount,
    verifiedAwardedRfqCount,
    linkedProcurementAvailability,
    identifierCoverage: buildRatio({
      numerator: identifiableProjectCount,
      denominator: totalProjects,
      availability: measurableAvailability,
      definition: "Projects with a nonblank Project Code / all company Projects.",
      limitation:
        "Project Code is the current deterministic association key. Missing identifiers are retained in the denominator and reported as data-quality gaps.",
    }),
    associationCoverage: buildRatio({
      numerator: linkedProjectCount,
      denominator: identifiableProjectCount,
      availability: measurableAvailability,
      definition:
        "Identifiable Projects with at least one verified same-company RFQ association / identifiable Projects.",
      limitation:
        "Association evidence uses normalized Project Code ↔ RFQ internal_project_id matching. It is string-keyed association evidence, not a relational Project foreign key.",
    }),
    limitations: [
      "Association evidence uses the existing normalized Project Code ↔ RFQ internal_project_id match inside the same company scope.",
      "Projects without a Project Code remain visible as identifier gaps and are not silently removed from identifier-coverage evidence.",
      "The loaded Project contract contains no quotation amounts, budget, schedule, completion, performance, savings, benchmark, or Project-risk evidence.",
    ],
  };
}
