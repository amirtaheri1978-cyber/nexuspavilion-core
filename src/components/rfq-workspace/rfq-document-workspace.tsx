import type { ComponentProps } from "react";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import RFQAddendaManager from "@/components/rfq-addenda-manager";
import RFQAddendumAcknowledgementCenter from "@/components/rfq-addendum-acknowledgement-center";
import RFQDocumentLibrary from "@/components/rfq-document-library";
import RFQDocumentUpload from "@/components/rfq-document-upload";
import { RFQRfiWorkspace } from "@/components/rfq-workspace/rfq-rfi-workspace";

type RFQDocumentLibraryProps = ComponentProps<typeof RFQDocumentLibrary>;
type RFQAddendaManagerProps = ComponentProps<typeof RFQAddendaManager>;
type RFQAddendumAcknowledgementCenterProps = ComponentProps<
  typeof RFQAddendumAcknowledgementCenter
>;

type RFQDocumentWorkspaceProps = {
  rfqId: string;
  companyId: string | null;
  isOwner: boolean;
  rfiDeadline?: string | null;
  rfiDeadlineTimezone?: string | null;
  documents: NonNullable<RFQDocumentLibraryProps["initialDocuments"]>;
  addenda: NonNullable<RFQAddendaManagerProps["initialAddenda"]>;
  acknowledgements: NonNullable<
    RFQAddendumAcknowledgementCenterProps["initialAcknowledgements"]
  >;
};

export function RFQDocumentWorkspace({
  rfqId,
  companyId,
  isOwner,
  rfiDeadline = null,
  rfiDeadlineTimezone = null,
  documents,
  addenda,
  acknowledgements,
}: RFQDocumentWorkspaceProps) {
  const participantRoleLabel = isOwner
    ? "Issuing Organization"
    : "Responding Organization";

  return (
    <ExecutivePanel
      id="document-center"
      className="mt-8 min-w-0 @container"
      padding="lg"
      tone="blue"
      data-rfq-document-workspace="true"
    >
      <section aria-labelledby="rfq-document-workspace-title">
        <div className="flex min-w-0 flex-col gap-6 @4xl:flex-row @4xl:items-start @4xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
              Procurement package
            </p>

            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-3">
              <ExecutiveBadge tone={isOwner ? "success" : "blue"}>
                {participantRoleLabel}
              </ExecutiveBadge>
            </div>

            <h2
              id="rfq-document-workspace-title"
              className="mt-3 min-w-0 text-pretty text-2xl font-black tracking-tight text-nexus-white sm:text-3xl"
            >
              Procurement package &amp; documents
            </h2>

            <p className="mt-3 max-w-4xl min-w-0 text-pretty text-sm font-semibold leading-7 text-nexus-muted">
              A controlled environment for drawings, specifications, bills of
              quantities, site records, supporting documents, private RFIs,
              issued addenda, respondent acknowledgements, and procurement
              package governance.
            </p>
          </div>

          <div
            className="grid min-w-0 grid-cols-1 gap-3 @sm:grid-cols-2"
            aria-label="RFQ document workspace metrics"
          >
            <ExecutiveMetricCard
              label="Documents"
              value={String(documents.length)}
              tone="blue"
            />

            <ExecutiveMetricCard
              label="Addenda"
              value={String(addenda.length)}
              tone="gold"
            />
          </div>
        </div>

        {isOwner && companyId ? (
          <section
            className="mt-8 min-w-0 border-t border-white/10 pt-8"
            aria-labelledby="rfq-document-upload-title"
            data-rfq-document-upload-center="true"
          >
            <div className="mb-6 min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-cyan-bright">
                Upload Center
              </p>

              <h3
                id="rfq-document-upload-title"
                className="mt-3 min-w-0 text-pretty text-xl font-black tracking-tight text-nexus-white sm:text-2xl"
              >
                Upload RFQ Documents
              </h3>

              <p className="mt-3 max-w-3xl min-w-0 text-pretty text-sm font-semibold leading-7 text-nexus-muted">
                Add drawings, specifications, BOQ files, site photos,
                clarifications, and supporting records to the active RFQ
                package. Files uploaded here remain connected to the live
                respondent workspace without changing the RFQ creation
                workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 @4xl:grid-cols-2">
              <RFQDocumentUpload
                rfqId={rfqId}
                companyId={companyId}
                attachmentType="drawing"
                title="Upload Drawings"
                description="Architectural, engineering, shop drawing, or PDF drawing packages."
              />

              <RFQDocumentUpload
                rfqId={rfqId}
                companyId={companyId}
                attachmentType="specification"
                title="Upload Specifications"
                description="Technical specifications, MasterFormat sections, product requirements, or scope documents."
              />

              <RFQDocumentUpload
                rfqId={rfqId}
                companyId={companyId}
                attachmentType="boq"
                title="Upload BOQ"
                description="Bills of quantities, bid forms, Excel pricing schedules, or quantity takeoff documents."
              />

              <RFQDocumentUpload
                rfqId={rfqId}
                companyId={companyId}
                attachmentType="photo"
                title="Upload Photos"
                description="Site photographs, existing conditions, reference images, or project context records."
              />

              <RFQDocumentUpload
                rfqId={rfqId}
                companyId={companyId}
                attachmentType="addenda"
                title="Upload Addenda"
                description="Clarifications, revisions, bulletins, updated instructions, or formal addendum files."
              />

              <RFQDocumentUpload
                rfqId={rfqId}
                companyId={companyId}
                attachmentType="supporting"
                title="Upload Supporting Documents"
                description="Schedules, reports, forms, calculations, compliance records, or other supporting files."
              />
            </div>
          </section>
        ) : null}

        <section
          className="mt-8 min-w-0 border-t border-nexus-gold/20 pt-8"
          aria-labelledby="rfq-document-library-title"
          data-rfq-document-library-section="true"
        >
          <div className="mb-6 min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
              Document Library
            </p>

            <h3
              id="rfq-document-library-title"
              className="mt-3 min-w-0 text-pretty text-xl font-black tracking-tight text-nexus-white sm:text-2xl"
            >
              Active RFQ Package
            </h3>

            <p className="mt-3 max-w-3xl min-w-0 text-pretty text-sm font-semibold leading-7 text-nexus-muted">
              Review the drawings, specifications, BOQ documents, site
              records, and supporting materials currently issued through
              this procurement workspace.
            </p>
          </div>

          <RFQDocumentLibrary
            rfqId={rfqId}
            initialDocuments={documents}
            canManage={isOwner}
          />
        </section>

        <section
          id="clarifications-addenda"
          className="mt-8 min-w-0 border-t border-nexus-gold/20 pt-8"
          aria-labelledby="rfq-addenda-workspace-title"
          data-rfq-addenda-workspace="true"
        >
          <div className="mb-6 min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
              Clarifications &amp; Addenda
            </p>

            <h3
              id="rfq-addenda-workspace-title"
              className="mt-3 min-w-0 text-pretty text-xl font-black tracking-tight text-nexus-white sm:text-2xl"
            >
              Private RFI, revisions, bulletins &amp; acknowledgements
            </h3>

            <p className="mt-3 max-w-3xl min-w-0 text-pretty text-sm font-semibold leading-7 text-nexus-muted">
              Submit private respondent inquiries, manage issued addenda, and
              track acknowledgements within the same controlled RFQ workspace
              while preserving the existing document and governance workflows.
            </p>
          </div>

          <div className="min-w-0 space-y-8">
            <RFQRfiWorkspace
              rfqId={rfqId}
              isOwner={isOwner}
              rfiDeadline={rfiDeadline}
              rfiDeadlineTimezone={rfiDeadlineTimezone}
            />

            {isOwner && companyId ? (
              <RFQAddendaManager
                rfqId={rfqId}
                initialAddenda={addenda}
                canManage
              />
            ) : (
              <RFQAddendumAcknowledgementCenter
                rfqId={rfqId}
                initialAddenda={addenda}
                initialAcknowledgements={acknowledgements}
              />
            )}
          </div>
        </section>
      </section>
    </ExecutivePanel>
  );
}
