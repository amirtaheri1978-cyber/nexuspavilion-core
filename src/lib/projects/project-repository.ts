import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapProjectRow,
  type ProjectCreateInput,
  type ProjectProcurementAssociation,
  type ProjectRecord,
} from "@/lib/projects/project-contract";

const PROJECT_SELECT = `
  id,
  company_id,
  created_by,
  name,
  project_code,
  owner_client,
  location,
  created_at,
  updated_at
`;

const RFQ_CONTEXT_SELECT = `
  id,
  slug,
  title,
  internal_project_id,
  status,
  awarded_at
`;

type ProjectRow = Parameters<typeof mapProjectRow>[0];

type ProjectRfqContextRow = {
  id: string;
  slug: string;
  title: string;
  internal_project_id: string | null;
  status: string;
  awarded_at: string | null;
};

export class ProjectRepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProjectRepositoryError";
  }
}

export class ProjectCodeConflictError extends Error {
  constructor() {
    super("A project with this project code already exists in the company workspace.");
    this.name = "ProjectCodeConflictError";
  }
}

function normalizeRequiredIdentifier(value: string) {
  return value.trim();
}

function normalizeProjectAssociationKey(value: string | null) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function mapProjectRfqContextRow(
  row: ProjectRfqContextRow,
): ProjectProcurementAssociation {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    awardedAt: row.awarded_at,
  };
}

export async function loadCompanyProjects(
  supabase: SupabaseClient,
  companyId: string,
): Promise<ProjectRecord[]> {
  const normalizedCompanyId = normalizeRequiredIdentifier(companyId);

  if (!normalizedCompanyId) {
    return [];
  }

  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("company_id", normalizedCompanyId)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new ProjectRepositoryError(
      "Unable to load the company Project Portfolio.",
      error,
    );
  }

  const projects = ((data ?? []) as ProjectRow[]).map(mapProjectRow);
  const projectAssociationKeys = new Set(
    projects
      .map((project) => normalizeProjectAssociationKey(project.projectCode))
      .filter(Boolean),
  );

  if (projectAssociationKeys.size === 0) {
    return projects;
  }

  const { data: rfqData, error: rfqError } = await supabase
    .from("rfqs")
    .select(RFQ_CONTEXT_SELECT)
    .eq("company_id", normalizedCompanyId)
    .not("internal_project_id", "is", null);

  if (rfqError) {
    throw new ProjectRepositoryError(
      "Unable to load verified Project procurement context.",
      rfqError,
    );
  }

  const associationsByProjectKey = new Map<
    string,
    ProjectProcurementAssociation[]
  >();

  for (const row of (rfqData ?? []) as ProjectRfqContextRow[]) {
    const associationKey = normalizeProjectAssociationKey(
      row.internal_project_id,
    );

    if (!associationKey || !projectAssociationKeys.has(associationKey)) {
      continue;
    }

    const associations = associationsByProjectKey.get(associationKey) ?? [];
    associations.push(mapProjectRfqContextRow(row));
    associationsByProjectKey.set(associationKey, associations);
  }

  for (const associations of associationsByProjectKey.values()) {
    associations.sort(
      (left, right) =>
        left.title.localeCompare(right.title) || left.id.localeCompare(right.id),
    );
  }

  return projects.map((project) => {
    const associationKey = normalizeProjectAssociationKey(project.projectCode);

    return {
      ...project,
      procurementAssociations:
        associationsByProjectKey.get(associationKey) ?? [],
    };
  });
}

export async function createCompanyProject(
  supabase: SupabaseClient,
  input: {
    companyId: string;
    createdBy: string;
    project: ProjectCreateInput;
  },
): Promise<ProjectRecord> {
  const companyId = normalizeRequiredIdentifier(input.companyId);
  const createdBy = normalizeRequiredIdentifier(input.createdBy);

  if (!companyId || !createdBy) {
    throw new ProjectRepositoryError(
      "A verified company workspace and authenticated creator are required.",
    );
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      company_id: companyId,
      created_by: createdBy,
      name: input.project.name,
      project_code: input.project.projectCode,
      owner_client: input.project.ownerClient,
      location: input.project.location,
    })
    .select(PROJECT_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ProjectCodeConflictError();
    }

    throw new ProjectRepositoryError(
      "Unable to create the Project record.",
      error,
    );
  }

  return mapProjectRow(data as ProjectRow);
}
