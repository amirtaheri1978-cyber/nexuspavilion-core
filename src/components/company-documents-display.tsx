"use client";

import {
  COMPANY_DOCUMENT_TYPE_LABELS,
  COMPANY_DOCUMENTS_SELF_DECLARED_NOTICE,
  deriveDocumentPresentation,
  formatDocumentDate,
  formatDocumentFileSize,
  hasAnyCompanyDocuments,
  isCompanyDocumentType,
  type CompanyDocumentRecord,
} from "@/lib/company/documents";
import { EXECUTIVE_FOCUS_GOLD } from "@/lib/design-system/executive-contract";

async function downloadCompanyDocument(
  companyId: string,
  documentId: string,
) {
  const response = await fetch(
    `/api/companies/${companyId}/documents/${documentId}/download`,
  );
  const data = (await response.json()) as { downloadUrl?: string };

  if (!response.ok || !data.downloadUrl) {
    return;
  }

  window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
}

type CompanyDocumentsDisplayProps = {
  documents: CompanyDocumentRecord[];
  companyId: string;
  className?: string;
};

function DocumentCard({
  document,
  companyId,
}: {
  document: CompanyDocumentRecord;
  companyId: string;
}) {
  const typeLabel = isCompanyDocumentType(document.document_type)
    ? COMPANY_DOCUMENT_TYPE_LABELS[document.document_type]
    : "Document";

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="min-w-0">
        <p className="text-sm font-black text-white break-words">
          {document.title}
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-400">{typeLabel}</p>
      </div>

      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            File
          </dt>
          <dd className="mt-1 font-semibold text-slate-300 break-words">
            {document.file_name}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Size
          </dt>
          <dd className="mt-1 font-semibold text-slate-300">
            {formatDocumentFileSize(document.file_size)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Issued
          </dt>
          <dd className="mt-1 font-semibold text-slate-300">
            {formatDocumentDate(document.issued_on)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Expires
          </dt>
          <dd className="mt-1 font-semibold text-slate-300">
            {formatDocumentDate(document.expires_on)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Status
          </dt>
          <dd className="mt-1 font-semibold text-slate-300">
            {deriveDocumentPresentation(document.expires_on)}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => {
          void downloadCompanyDocument(companyId, document.id);
        }}
        className={`mt-4 inline-flex min-h-11 items-center rounded-full border border-white/10 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-300 transition hover:border-[#C8A646]/40 hover:text-white ${EXECUTIVE_FOCUS_GOLD}`}
      >
        Download
      </button>
    </article>
  );
}

export function CompanyDocumentsDisplay({
  documents,
  companyId,
  className = "",
}: CompanyDocumentsDisplayProps) {
  const hasAny = hasAnyCompanyDocuments(documents);

  return (
    <section className={className}>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
        Company Governance
      </p>

      <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
        Company Documents
      </h2>

      <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
        Governance evidence files maintained by your organization.{" "}
        {COMPANY_DOCUMENTS_SELF_DECLARED_NOTICE}
      </p>

      {hasAny ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {documents.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              companyId={companyId}
            />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm font-semibold text-slate-500">
          Not provided
        </p>
      )}
    </section>
  );
}
