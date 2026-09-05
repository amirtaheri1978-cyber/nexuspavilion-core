import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapProjectRow,
  type ProjectCreateInput,
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

type ProjectRow = Parameters<typeof mapProjectRow>[0];

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

  return ((data ?? []) as ProjectRow[]).map(mapProjectRow);
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
