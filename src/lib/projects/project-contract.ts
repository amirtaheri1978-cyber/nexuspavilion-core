export const PROJECT_NAME_MAX_LENGTH = 180;
export const PROJECT_CODE_MAX_LENGTH = 80;
export const PROJECT_TEXT_MAX_LENGTH = 180;

export type ProjectProcurementAssociation = {
  id: string;
  slug: string;
  title: string;
  status: string;
  awardedAt: string | null;
};

export type ProjectRecord = {
  id: string;
  companyId: string;
  createdBy: string | null;
  name: string;
  projectCode: string | null;
  ownerClient: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
  procurementAssociations: ProjectProcurementAssociation[];
};

export type ProjectCreateInput = {
  name: string;
  projectCode: string | null;
  ownerClient: string | null;
  location: string | null;
};

export type ProjectCreateParseResult =
  | {
      ok: true;
      value: ProjectCreateInput;
    }
  | {
      ok: false;
      error: string;
    };

type ProjectRow = {
  id: string;
  company_id: string;
  created_by: string | null;
  name: string;
  project_code: string | null;
  owner_client: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeWhitespace(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeOptionalText(value: unknown) {
  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 ? normalized : null;
}

export function parseProjectCreateInput(
  payload: unknown,
): ProjectCreateParseResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      ok: false,
      error: "Project details are required.",
    };
  }

  const body = payload as Record<string, unknown>;
  const name = normalizeWhitespace(body.name);
  const projectCode = normalizeOptionalText(body.project_code);
  const ownerClient = normalizeOptionalText(body.owner_client);
  const location = normalizeOptionalText(body.location);

  if (!name) {
    return {
      ok: false,
      error: "Project name is required.",
    };
  }

  if (name.length > PROJECT_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Project name must be ${PROJECT_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (projectCode && projectCode.length > PROJECT_CODE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Project code must be ${PROJECT_CODE_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (ownerClient && ownerClient.length > PROJECT_TEXT_MAX_LENGTH) {
    return {
      ok: false,
      error: `Owner / client must be ${PROJECT_TEXT_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (location && location.length > PROJECT_TEXT_MAX_LENGTH) {
    return {
      ok: false,
      error: `Location must be ${PROJECT_TEXT_MAX_LENGTH} characters or fewer.`,
    };
  }

  return {
    ok: true,
    value: {
      name,
      projectCode,
      ownerClient,
      location,
    },
  };
}

export function mapProjectRow(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    createdBy: row.created_by,
    name: row.name,
    projectCode: row.project_code,
    ownerClient: row.owner_client,
    location: row.location,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    procurementAssociations: [],
  };
}
