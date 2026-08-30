import { describe, expect, it } from "vitest";

import {
  buildCompanyDocumentPath,
  COMPANY_DOCUMENT_ALLOWED_MIME_TYPES,
  COMPANY_DOCUMENT_ITEM_FIELDS,
  COMPANY_DOCUMENT_MAX_FILE_SIZE,
  COMPANY_DOCUMENT_REJECTED_EXTENSIONS,
  COMPANY_DOCUMENT_SIGNED_DOWNLOAD_TTL_SECONDS,
  COMPANY_DOCUMENT_TYPES,
  COMPANY_DOCUMENT_TYPE_LABELS,
  COMPANY_DOCUMENTS_SELF_DECLARED_NOTICE,
  deriveDocumentPresentation,
  formatDocumentDate,
  isCompanyDocumentType,
  isValidCompanyDocumentPath,
  normalizeCreateDocumentInputForCompany,
  normalizeDocumentDate,
  normalizeUploadIntentInput,
  validateFileSize,
  validateMimeExtensionPair,
} from "@/lib/company/documents";

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";
const DOCUMENT_ID = "22222222-2222-2222-2222-222222222222";
const OBJECT_ID = "33333333-3333-3333-3333-333333333333";
const REFERENCE_DATE = new Date("2026-06-15T12:00:00Z");

const validPath = buildCompanyDocumentPath(
  COMPANY_ID,
  DOCUMENT_ID,
  OBJECT_ID,
  "pdf",
);

describe("company documents domain shape", () => {
  it("exposes exactly the five approved document types", () => {
    expect(COMPANY_DOCUMENT_TYPES).toEqual([
      "insurance",
      "workers_compensation",
      "safety",
      "qualification",
      "other",
    ]);
    expect(Object.keys(COMPANY_DOCUMENT_TYPE_LABELS)).toEqual([
      "insurance",
      "workers_compensation",
      "safety",
      "qualification",
      "other",
    ]);
    expect(isCompanyDocumentType("insurance")).toBe(true);
    expect(isCompanyDocumentType("license")).toBe(false);
    expect(isCompanyDocumentType("tax_document")).toBe(false);
  });

  it("exposes the approved metadata fields and no fact-registry fields", () => {
    expect(COMPANY_DOCUMENT_ITEM_FIELDS).toEqual([
      "document_type",
      "title",
      "file_name",
      "file_path",
      "file_type",
      "file_size",
      "issued_on",
      "expires_on",
    ]);
    expect(COMPANY_DOCUMENT_ITEM_FIELDS).not.toContain("issuer");
    expect(COMPANY_DOCUMENT_ITEM_FIELDS).not.toContain("provider");
    expect(COMPANY_DOCUMENT_ITEM_FIELDS).not.toContain("credential_identifier");
    expect(COMPANY_DOCUMENT_ITEM_FIELDS).not.toContain("qualification_id");
    expect(COMPANY_DOCUMENT_ITEM_FIELDS).not.toContain("compliance_id");
    expect(COMPANY_DOCUMENT_ITEM_FIELDS).not.toContain("status");
  });

  it("states that documents are self-declared rather than platform verified", () => {
    expect(COMPANY_DOCUMENTS_SELF_DECLARED_NOTICE).toBe(
      "Documents are maintained by this organization and have not been independently verified by Nexus Pavilion.",
    );
    expect(COMPANY_DOCUMENTS_SELF_DECLARED_NOTICE).not.toMatch(
      /\b(verified by us|approved|validated|certified by)\b/i,
    );
  });

  it("uses a 60-second signed download TTL and a 10 MiB size cap", () => {
    expect(COMPANY_DOCUMENT_SIGNED_DOWNLOAD_TTL_SECONDS).toBe(60);
    expect(COMPANY_DOCUMENT_MAX_FILE_SIZE).toBe(10_485_760);
    expect(COMPANY_DOCUMENT_ALLOWED_MIME_TYPES).toEqual([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });
});

describe("company document MIME and extension pairs", () => {
  it("accepts only matching MIME and extension pairs", () => {
    expect(
      validateMimeExtensionPair("certificate.pdf", "application/pdf").error,
    ).toBeNull();
    expect(
      validateMimeExtensionPair("scan.jpg", "image/jpeg").error,
    ).toBeNull();
    expect(
      validateMimeExtensionPair("scan.jpeg", "image/jpeg").error,
    ).toBeNull();
    expect(
      validateMimeExtensionPair("scan.png", "image/png").error,
    ).toBeNull();
    expect(
      validateMimeExtensionPair("scan.webp", "image/webp").error,
    ).toBeNull();
  });

  it("rejects MIME and extension mismatches", () => {
    const result = validateMimeExtensionPair("scan.png", "application/pdf");

    expect(result.error).toBe("File type and extension do not match.");
  });

  it("rejects unsupported and dangerous extensions", () => {
    for (const extension of COMPANY_DOCUMENT_REJECTED_EXTENSIONS) {
      const result = validateMimeExtensionPair(
        `payload${extension}`,
        "application/pdf",
      );

      expect(result.error).toBe("This file type is not allowed.");
    }
  });
});

describe("company document size and date validation", () => {
  it("rejects zero, negative, and oversized files", () => {
    expect(validateFileSize(0).error).toBe(
      "File size must be greater than 0 and at most 10 MB.",
    );
    expect(validateFileSize(-1).error).toBe(
      "File size must be greater than 0 and at most 10 MB.",
    );
    expect(validateFileSize(10_485_761).error).toBe(
      "File size must be greater than 0 and at most 10 MB.",
    );
    expect(validateFileSize(2048).value).toBe(2048);
  });

  it("requires expiry to be on or after the issued date", () => {
    const result = normalizeCreateDocumentInputForCompany(
      {
        id: DOCUMENT_ID,
        document_type: "insurance",
        title: "QA Commercial General Liability",
        file_name: "certificate.pdf",
        file_path: validPath,
        file_type: "application/pdf",
        file_size: 2048,
        issued_on: "2026-06-15",
        expires_on: "2026-06-14",
      },
      COMPANY_ID,
    );

    expect(result.error).toBe(
      "Expiry date must be on or after the issued date.",
    );
  });

  it("rejects non-ISO and invalid calendar dates", () => {
    expect(normalizeDocumentDate("2026-6-15").error).toBe(
      "Document dates must use YYYY-MM-DD format.",
    );
    expect(normalizeDocumentDate("2026-02-30").error).toBe(
      "Document dates must be valid calendar dates.",
    );
  });
});

describe("company document generated path contract", () => {
  it("builds a company/document/object path without the original filename", () => {
    expect(validPath).toBe(
      `${COMPANY_ID}/${DOCUMENT_ID}/${OBJECT_ID}.pdf`,
    );
    expect(validPath).not.toContain("certificate");
    expect(
      isValidCompanyDocumentPath(
        validPath,
        COMPANY_ID,
        DOCUMENT_ID,
        "certificate.pdf",
      ),
    ).toBe(true);
  });

  it("rejects traversal, absolute, and user-supplied filename paths", () => {
    expect(
      isValidCompanyDocumentPath(
        `${COMPANY_ID}/../${DOCUMENT_ID}/${OBJECT_ID}.pdf`,
        COMPANY_ID,
        DOCUMENT_ID,
      ),
    ).toBe(false);
    expect(
      isValidCompanyDocumentPath(
        `/${COMPANY_ID}/${DOCUMENT_ID}/${OBJECT_ID}.pdf`,
        COMPANY_ID,
        DOCUMENT_ID,
      ),
    ).toBe(false);
    expect(
      isValidCompanyDocumentPath(
        `${COMPANY_ID}/${DOCUMENT_ID}/certificate.pdf`,
        COMPANY_ID,
        DOCUMENT_ID,
        "certificate.pdf",
      ),
    ).toBe(false);
  });

  it("accepts a generated UUID path even when a short filename matches the object suffix", () => {
    const collidingObjectId = "00000000-0000-0000-0000-00000000000a";
    const generatedPath = buildCompanyDocumentPath(
      COMPANY_ID,
      DOCUMENT_ID,
      collidingObjectId,
      "pdf",
    );

    expect(generatedPath).toBe(
      `${COMPANY_ID}/${DOCUMENT_ID}/${collidingObjectId}.pdf`,
    );
    expect(generatedPath.endsWith("000a.pdf")).toBe(true);
    expect(generatedPath).not.toContain("/a.pdf");
    expect(
      isValidCompanyDocumentPath(generatedPath, COMPANY_ID, DOCUMENT_ID, "a.pdf"),
    ).toBe(true);
  });
});

describe("company document derived expiry states", () => {
  it("derives exactly four states from expires_on only", () => {
    expect(deriveDocumentPresentation(null, REFERENCE_DATE)).toBe(
      "No expiry recorded",
    );
    expect(deriveDocumentPresentation("2026-05-01", REFERENCE_DATE)).toBe(
      "Expired",
    );
    expect(deriveDocumentPresentation("2026-07-01", REFERENCE_DATE)).toBe(
      "Expiring soon",
    );
    expect(deriveDocumentPresentation("2026-12-01", REFERENCE_DATE)).toBe(
      "Current",
    );
  });

  it("never creates a not-yet-effective state from issued_on", () => {
    const source = [
      deriveDocumentPresentation,
      formatDocumentDate,
    ]
      .map((fn) => fn.toString())
      .join("\n");

    expect(source).not.toContain("Not yet effective");
    expect(deriveDocumentPresentation("2027-01-01", REFERENCE_DATE)).toBe(
      "Current",
    );
  });
});

describe("company document upload intent normalization", () => {
  it("accepts a valid upload intent and optional replacement document id", () => {
    const result = normalizeUploadIntentInput({
      fileName: "certificate.pdf",
      fileType: "application/pdf",
      fileSize: 4096,
      documentId: DOCUMENT_ID,
    });

    expect(result.error).toBeNull();
    expect(result.intent).toEqual({
      fileName: "certificate.pdf",
      fileType: "application/pdf",
      fileSize: 4096,
      documentId: DOCUMENT_ID,
      extension: "pdf",
    });
  });

  it("rejects unsupported upload fields before accepting the file", () => {
    const result = normalizeUploadIntentInput({
      fileName: "certificate.pdf",
      fileType: "application/pdf",
      fileSize: 4096,
      signedUrl: "https://example.test/secret",
    });

    expect(result.error).toBe('Upload field "signedUrl" is not supported.');
  });
});
