import type { SupabaseClient } from "@supabase/supabase-js";

export const COMPANY_DOCUMENT_TYPES = [
  "insurance",
  "workers_compensation",
  "safety",
  "qualification",
  "other",
] as const;

export type CompanyDocumentType = (typeof COMPANY_DOCUMENT_TYPES)[number];

export const COMPANY_DOCUMENT_TYPE_LABELS: Record<
  CompanyDocumentType,
  string
> = {
  insurance: "Insurance",
  workers_compensation: "Workers' Compensation",
  safety: "Safety",
  qualification: "Qualification",
  other: "Other",
};

export const COMPANY_DOCUMENT_MAX_TITLE_LENGTH = 160;
export const COMPANY_DOCUMENT_MAX_FILE_NAME_LENGTH = 255;
export const COMPANY_DOCUMENT_MAX_FILE_SIZE = 10_485_760;
export const COMPANY_DOCUMENT_SIGNED_DOWNLOAD_TTL_SECONDS = 60;
export const COMPANY_DOCUMENTS_BUCKET = "company-documents";

export const COMPANY_DOCUMENT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type CompanyDocumentMimeType =
  (typeof COMPANY_DOCUMENT_ALLOWED_MIME_TYPES)[number];

export const COMPANY_DOCUMENT_MIME_EXTENSIONS: Record<
  CompanyDocumentMimeType,
  readonly string[]
> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

export const COMPANY_DOCUMENT_REJECTED_EXTENSIONS = [
  ".svg",
  ".html",
  ".htm",
  ".js",
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".ps1",
  ".zip",
  ".rar",
  ".7z",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".xlsm",
  ".ppt",
  ".pptx",
] as const;

export const COMPANY_DOCUMENTS_SELF_DECLARED_NOTICE =
  "Documents are maintained by this organization and have not been independently verified by Nexus Pavilion.";

export const COMPANY_DOCUMENT_ITEM_FIELDS = [
  "document_type",
  "title",
  "file_name",
  "file_path",
  "file_type",
  "file_size",
  "issued_on",
  "expires_on",
] as const;

export type CompanyDocumentRecord = {
  id: string;
  company_id: string;
  document_type: CompanyDocumentType;
  title: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  issued_on: string | null;
  expires_on: string | null;
  uploaded_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CompanyDocumentInput = {
  document_type: CompanyDocumentType;
  title: string;
  file_name: string;
  file_path: string;
  file_type: CompanyDocumentMimeType;
  file_size: number;
  issued_on: string | null;
  expires_on: string | null;
};

export type CompanyDocumentUploadIntentInput = {
  fileName: string;
  fileType: string;
  fileSize: number;
  documentId?: string | null;
};

export type DocumentPresentation =
  | "No expiry recorded"
  | "Expired"
  | "Expiring soon"
  | "Current";

export const DOCUMENT_EXPIRING_SOON_DAYS = 30;

const DOCUMENT_TYPE_SET = new Set<string>(COMPANY_DOCUMENT_TYPES);
const MIME_TYPE_SET = new Set<string>(COMPANY_DOCUMENT_ALLOWED_MIME_TYPES);
const REJECTED_EXTENSION_SET = new Set<string>(
  COMPANY_DOCUMENT_REJECTED_EXTENSIONS,
);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_ERROR_TOKEN_PATTERN = /^[A-Za-z0-9_]{1,32}$/;

const EXTENSION_BY_MIME: Record<CompanyDocumentMimeType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isCompanyDocumentType(
  value: string,
): value is CompanyDocumentType {
  return DOCUMENT_TYPE_SET.has(value);
}

export function isCompanyDocumentMimeType(
  value: string,
): value is CompanyDocumentMimeType {
  return MIME_TYPE_SET.has(value);
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function readSafeErrorToken(
  error: unknown,
  property: "code" | "name",
): string {
  const value =
    error && typeof error === "object" && property in error
      ? (error as Record<string, unknown>)[property]
      : undefined;

  if (typeof value === "string" && SAFE_ERROR_TOKEN_PATTERN.test(value)) {
    return value;
  }

  return "UNKNOWN";
}

export function toSafeErrorCode(error: unknown): string {
  return readSafeErrorToken(error, "code");
}

export function toSafeErrorName(error: unknown): string {
  return readSafeErrorToken(error, "name");
}

export function normalizeDocumentText(
  value: unknown,
  maxLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized || normalized.length > maxLength) {
    return null;
  }

  return normalized;
}

export function normalizeDocumentDate(
  value: unknown,
): { value: string | null; error: string | null } {
  if (value === null || value === undefined || value === "") {
    return { value: null, error: null };
  }

  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    return {
      value: null,
      error: "Document dates must use YYYY-MM-DD format.",
    };
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return {
      value: null,
      error: "Document dates must be valid calendar dates.",
    };
  }

  return { value, error: null };
}

export function extractFileExtension(fileName: string): string | null {
  const trimmed = fileName.trim().toLowerCase();
  const lastDot = trimmed.lastIndexOf(".");

  if (lastDot <= 0 || lastDot === trimmed.length - 1) {
    return null;
  }

  return trimmed.slice(lastDot);
}

export function validateMimeExtensionPair(
  fileName: unknown,
  fileType: unknown,
): { extension: string | null; mimeType: CompanyDocumentMimeType | null; error: string | null } {
  if (typeof fileName !== "string" || typeof fileType !== "string") {
    return {
      extension: null,
      mimeType: null,
      error: "File name and type are required.",
    };
  }

  const extension = extractFileExtension(fileName);

  if (!extension) {
    return {
      extension: null,
      mimeType: null,
      error: "A supported file extension is required.",
    };
  }

  if (REJECTED_EXTENSION_SET.has(extension)) {
    return {
      extension: null,
      mimeType: null,
      error: "This file type is not allowed.",
    };
  }

  if (!isCompanyDocumentMimeType(fileType)) {
    return {
      extension: null,
      mimeType: null,
      error: "This file type is not allowed.",
    };
  }

  const allowedExtensions = COMPANY_DOCUMENT_MIME_EXTENSIONS[fileType];

  if (!allowedExtensions.includes(extension)) {
    return {
      extension: null,
      mimeType: null,
      error: "File type and extension do not match.",
    };
  }

  return {
    extension: extension.slice(1),
    mimeType: fileType,
    error: null,
  };
}

export function validateFileSize(
  value: unknown,
): { value: number | null; error: string | null } {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return {
      value: null,
      error: "File size must be a number.",
    };
  }

  if (value <= 0 || value > COMPANY_DOCUMENT_MAX_FILE_SIZE) {
    return {
      value: null,
      error: "File size must be greater than 0 and at most 10 MB.",
    };
  }

  return { value, error: null };
}

export function buildCompanyDocumentPath(
  companyId: string,
  documentId: string,
  objectId: string,
  extension: string,
): string {
  return `${companyId}/${documentId}/${objectId}.${extension}`;
}

export function isUnsafeDocumentPath(value: string): boolean {
  return (
    value.includes("..") ||
    value.includes("\\") ||
    value.startsWith("/") ||
    value.includes("//") ||
    /%2e%2e/i.test(value) ||
    /%2f/i.test(value) ||
    /%5c/i.test(value)
  );
}

export function isValidCompanyDocumentPath(
  filePath: string,
  companyId: string,
  documentId: string,
  _fileName?: string,
): boolean {
  void _fileName;

  if (!isUuid(companyId) || !isUuid(documentId) || isUnsafeDocumentPath(filePath)) {
    return false;
  }

  const expectedPrefix = `${companyId.toLowerCase()}/${documentId.toLowerCase()}/`;
  const normalizedPath = filePath.toLowerCase();

  if (!normalizedPath.startsWith(expectedPrefix)) {
    return false;
  }

  const objectName = normalizedPath.slice(expectedPrefix.length);
  const match = objectName.match(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|jpeg|png|webp)$/,
  );

  return Boolean(match);
}

export function normalizeUploadIntentInput(
  input: unknown,
): {
  intent: {
    fileName: string;
    fileType: CompanyDocumentMimeType;
    fileSize: number;
    documentId: string | null;
    extension: string;
  } | null;
  error: string | null;
} {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { intent: null, error: "Upload intent must be an object." };
  }

  const source = input as Record<string, unknown>;

  for (const field of Object.keys(source)) {
    if (
      field !== "fileName" &&
      field !== "fileType" &&
      field !== "fileSize" &&
      field !== "documentId"
    ) {
      return {
        intent: null,
        error: `Upload field "${field}" is not supported.`,
      };
    }
  }

  const fileName = normalizeDocumentText(
    source.fileName,
    COMPANY_DOCUMENT_MAX_FILE_NAME_LENGTH,
  );

  if (!fileName) {
    return {
      intent: null,
      error:
        typeof source.fileName === "string"
          ? "File name must be non-empty and 255 characters or fewer."
          : "File name must be a string.",
    };
  }

  const pair = validateMimeExtensionPair(fileName, source.fileType);

  if (pair.error || !pair.mimeType || !pair.extension) {
    return { intent: null, error: pair.error || "File type is not allowed." };
  }

  const fileSize = validateFileSize(source.fileSize);

  if (fileSize.error || fileSize.value === null) {
    return { intent: null, error: fileSize.error };
  }

  let documentId: string | null = null;

  if (
    source.documentId !== undefined &&
    source.documentId !== null &&
    source.documentId !== ""
  ) {
    if (typeof source.documentId !== "string" || !isUuid(source.documentId)) {
      return { intent: null, error: "Document ID must be a valid UUID." };
    }

    documentId = source.documentId.toLowerCase();
  }

  return {
    intent: {
      fileName,
      fileType: pair.mimeType,
      fileSize: fileSize.value,
      documentId,
      extension: pair.extension,
    },
    error: null,
  };
}

export function normalizeCreateDocumentInput(
  input: unknown,
): { document: CompanyDocumentInput & { id: string }; error: string | null } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      document: null as never,
      error: "Document payload must be an object.",
    };
  }

  const source = input as Record<string, unknown>;

  for (const field of Object.keys(source)) {
    if (
      field !== "id" &&
      field !== "document_type" &&
      !COMPANY_DOCUMENT_ITEM_FIELDS.includes(
        field as (typeof COMPANY_DOCUMENT_ITEM_FIELDS)[number],
      )
    ) {
      return {
        document: null as never,
        error: `Document field "${field}" is not supported.`,
      };
    }
  }

  if (typeof source.id !== "string" || !isUuid(source.id)) {
    return {
      document: null as never,
      error: "Document ID must be a valid UUID.",
    };
  }

  if (
    typeof source.document_type !== "string" ||
    !isCompanyDocumentType(source.document_type)
  ) {
    return {
      document: null as never,
      error:
        "Document type must be insurance, workers_compensation, safety, qualification, or other.",
    };
  }

  const title = normalizeDocumentText(
    source.title,
    COMPANY_DOCUMENT_MAX_TITLE_LENGTH,
  );

  if (!title) {
    return {
      document: null as never,
      error:
        typeof source.title === "string"
          ? "Document title must be non-empty and 160 characters or fewer."
          : "Document title must be a string.",
    };
  }

  const fileName = normalizeDocumentText(
    source.file_name,
    COMPANY_DOCUMENT_MAX_FILE_NAME_LENGTH,
  );

  if (!fileName) {
    return {
      document: null as never,
      error:
        typeof source.file_name === "string"
          ? "File name must be non-empty and 255 characters or fewer."
          : "File name must be a string.",
    };
  }

  if (typeof source.file_path !== "string") {
    return {
      document: null as never,
      error: "File path must be a string.",
    };
  }

  if (!isValidGeneratedPathShape(source.file_path, source.id)) {
    return {
      document: null as never,
      error: "File path is invalid.",
    };
  }

  const pair = validateMimeExtensionPair(fileName, source.file_type);

  if (pair.error || !pair.mimeType) {
    return {
      document: null as never,
      error: pair.error || "File type is not allowed.",
    };
  }

  const fileSize = validateFileSize(source.file_size);

  if (fileSize.error || fileSize.value === null) {
    return {
      document: null as never,
      error: fileSize.error,
    };
  }

  const issuedOn = normalizeDocumentDate(source.issued_on);

  if (issuedOn.error) {
    return { document: null as never, error: issuedOn.error };
  }

  const expiresOn = normalizeDocumentDate(source.expires_on);

  if (expiresOn.error) {
    return { document: null as never, error: expiresOn.error };
  }

  if (
    issuedOn.value &&
    expiresOn.value &&
    expiresOn.value < issuedOn.value
  ) {
    return {
      document: null as never,
      error: "Expiry date must be on or after the issued date.",
    };
  }

  return {
    document: {
      id: source.id.toLowerCase(),
      document_type: source.document_type,
      title,
      file_name: fileName,
      file_path: source.file_path,
      file_type: pair.mimeType,
      file_size: fileSize.value,
      issued_on: issuedOn.value,
      expires_on: expiresOn.value,
    },
    error: null,
  };
}

function isValidGeneratedPathShape(
  filePath: string,
  documentId: string,
): boolean {
  if (isUnsafeDocumentPath(filePath) || !isUuid(documentId)) {
    return false;
  }

  const segments = filePath.split("/");

  if (segments.length !== 3) {
    return false;
  }

  const [companyId, pathDocumentId, objectName] = segments;

  if (!isUuid(companyId) || pathDocumentId.toLowerCase() !== documentId.toLowerCase()) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|jpeg|png|webp)$/i.test(
    objectName,
  );
}

export function normalizeCreateDocumentInputForCompany(
  input: unknown,
  companyId: string,
): { document: CompanyDocumentInput & { id: string }; error: string | null } {
  const normalized = normalizeCreateDocumentInput(input);

  if (normalized.error) {
    return normalized;
  }

  if (
    !isValidCompanyDocumentPath(
      normalized.document.file_path,
      companyId,
      normalized.document.id,
      normalized.document.file_name,
    )
  ) {
    return {
      document: null as never,
      error: "File path is invalid.",
    };
  }

  return normalized;
}

export function normalizeDocumentMetadataPatch(
  input: unknown,
): {
  patch: {
    document_type: CompanyDocumentType;
    title: string;
    issued_on: string | null;
    expires_on: string | null;
    replacement: {
      file_name: string;
      file_path: string;
      file_type: CompanyDocumentMimeType;
      file_size: number;
    } | null;
  } | null;
  error: string | null;
} {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { patch: null, error: "Document payload must be an object." };
  }

  const source = input as Record<string, unknown>;
  const allowed = new Set([
    "document_type",
    "title",
    "issued_on",
    "expires_on",
    "file_name",
    "file_path",
    "file_type",
    "file_size",
  ]);

  for (const field of Object.keys(source)) {
    if (!allowed.has(field)) {
      return {
        patch: null,
        error: `Document field "${field}" is not supported.`,
      };
    }
  }

  if (
    typeof source.document_type !== "string" ||
    !isCompanyDocumentType(source.document_type)
  ) {
    return {
      patch: null,
      error:
        "Document type must be insurance, workers_compensation, safety, qualification, or other.",
    };
  }

  const title = normalizeDocumentText(
    source.title,
    COMPANY_DOCUMENT_MAX_TITLE_LENGTH,
  );

  if (!title) {
    return {
      patch: null,
      error:
        typeof source.title === "string"
          ? "Document title must be non-empty and 160 characters or fewer."
          : "Document title must be a string.",
    };
  }

  const issuedOn = normalizeDocumentDate(source.issued_on);

  if (issuedOn.error) {
    return { patch: null, error: issuedOn.error };
  }

  const expiresOn = normalizeDocumentDate(source.expires_on);

  if (expiresOn.error) {
    return { patch: null, error: expiresOn.error };
  }

  if (
    issuedOn.value &&
    expiresOn.value &&
    expiresOn.value < issuedOn.value
  ) {
    return {
      patch: null,
      error: "Expiry date must be on or after the issued date.",
    };
  }

  const hasReplacementField =
    "file_name" in source ||
    "file_path" in source ||
    "file_type" in source ||
    "file_size" in source;

  if (!hasReplacementField) {
    return {
      patch: {
        document_type: source.document_type,
        title,
        issued_on: issuedOn.value,
        expires_on: expiresOn.value,
        replacement: null,
      },
      error: null,
    };
  }

  const fileName = normalizeDocumentText(
    source.file_name,
    COMPANY_DOCUMENT_MAX_FILE_NAME_LENGTH,
  );

  if (!fileName) {
    return {
      patch: null,
      error: "Replacement file name must be non-empty and 255 characters or fewer.",
    };
  }

  if (typeof source.file_path !== "string" || isUnsafeDocumentPath(source.file_path)) {
    return { patch: null, error: "File path is invalid." };
  }

  const pair = validateMimeExtensionPair(fileName, source.file_type);

  if (pair.error || !pair.mimeType) {
    return { patch: null, error: pair.error || "File type is not allowed." };
  }

  const fileSize = validateFileSize(source.file_size);

  if (fileSize.error || fileSize.value === null) {
    return { patch: null, error: fileSize.error };
  }

  return {
    patch: {
      document_type: source.document_type,
      title,
      issued_on: issuedOn.value,
      expires_on: expiresOn.value,
      replacement: {
        file_name: fileName,
        file_path: source.file_path,
        file_type: pair.mimeType,
        file_size: fileSize.value,
      },
    },
    error: null,
  };
}

function toUtcDay(value: string): number | null {
  const parsed = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.getTime();
}

// Presentation is always derived at render time from expires_on only.
// issued_on is informational and never creates a "Not yet effective" state.
export function deriveDocumentPresentation(
  expiresOn: string | null | undefined,
  referenceDate = new Date(),
): DocumentPresentation {
  if (!expiresOn) {
    return "No expiry recorded";
  }

  const expiry = toUtcDay(expiresOn);

  if (expiry === null) {
    return "No expiry recorded";
  }

  const today = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
  );
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return "Expired";
  }

  if (diffDays <= DOCUMENT_EXPIRING_SOON_DAYS) {
    return "Expiring soon";
  }

  return "Current";
}

export function formatDocumentDate(value: string | null | undefined) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatDocumentFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function countCompanyDocumentsByType(
  documents: CompanyDocumentRecord[],
): Record<CompanyDocumentType, number> {
  const counts: Record<CompanyDocumentType, number> = {
    insurance: 0,
    workers_compensation: 0,
    safety: 0,
    qualification: 0,
    other: 0,
  };

  for (const document of documents) {
    if (isCompanyDocumentType(document.document_type)) {
      counts[document.document_type] += 1;
    }
  }

  return counts;
}

export function hasAnyCompanyDocuments(documents: CompanyDocumentRecord[]) {
  return documents.length > 0;
}

export function extensionForMimeType(
  mimeType: CompanyDocumentMimeType,
  fileName?: string,
): string {
  if (fileName) {
    const extension = extractFileExtension(fileName);

    if (
      extension &&
      COMPANY_DOCUMENT_MIME_EXTENSIONS[mimeType].includes(extension)
    ) {
      return extension.slice(1);
    }
  }

  return EXTENSION_BY_MIME[mimeType];
}

export async function loadCompanyDocuments(
  supabase: SupabaseClient,
  companyId: string,
): Promise<CompanyDocumentRecord[]> {
  const { data, error } = await supabase
    .from("company_documents")
    .select(
      "id, company_id, document_type, title, file_name, file_path, file_type, file_size, issued_on, expires_on, uploaded_by, created_at, updated_at",
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as CompanyDocumentRecord[];
}
