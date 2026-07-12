import type { ComponentProps } from "react";

import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import RFQAddendaManager from "@/components/rfq-addenda-manager";
import RFQAddendumAcknowledgementCenter from "@/components/rfq-addendum-acknowledgement-center";
import RFQDocumentLibrary from "@/components/rfq-document-library";
import RFQDocumentUpload from "@/components/rfq-document-upload";

type RFQDocumentLibraryProps = ComponentProps<typeof RFQDocumentLibrary>;
type RFQAddendaManagerProps = ComponentProps<typeof RFQAddendaManager>;
type RFQAddendumAcknowledgementCenterProps = ComponentProps<
  typeof RFQAddendumAcknowledgementCenter
>;

type RFQDocumentWorkspaceProps = {
  rfqId: string;
  companyId: string | null;
  isOwner: boolean;
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
      className="mt-8"
      padding="lg"
      tone="blue"
    >
      <section aria-labelledby="rfq-document-workspace-title">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
              Executive Document Center
            </p>

            <h2
              id="rfq-document-workspace-title"
              className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl xl:text-4xl"
            >
              Procurement Package Control Room
            </h2>

            <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
              A controlled environment for drawings, specifications, bills of
              quantities, site records, supporting documents, issued addenda,
              supplier acknowledgements, and procurement package governance.
            </p>
          </div>

          <div
            className="grid min-w-0 gap-3 sm:grid-cols-2 xl:min-w-[520px] xl:grid-cols-[1fr_1fr_1.2fr]"
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

            <ExecutiveMetricCard
              label="RFQ Role"
              value={participantRoleLabel}
              tone={isOwner ? "success" : "blue"}
            />
          </div>
        </div>

        {isOwner && companyId ? (
          <ExecutivePanel
            className="mt-8"
            variant="operational"
            padding="md"
            tone="blue"
          >
            <section aria-labelledby="rfq-document-upload-title">
              <div className="mb-6 min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
                  Upload Center
                </p>

                <h3
                  id="rfq-document-upload-title"
                  className="mt-3 text-xl font-black tracking-tight text-nexus-white sm:text-2xl"
                >
                  Upload RFQ Documents
                </h3>

                <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
                  Add drawings, specifications, BOQ files, site photos,
                  clarifications, and supporting records to the active RFQ
                  package. Files uploaded here remain connected to the live
                  supplier-facing workspace without changing the RFQ creation
                  workflow.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
          </ExecutivePanel>
        ) : null}

        <ExecutivePanel
          className="mt-8"
          variant="operational"
          padding="md"
          tone="gold"
        >
          <section aria-labelledby="rfq-document-library-title">
            <div className="mb-6 min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
                Document Library
              </p>

              <h3
                id="rfq-document-library-title"
                className="mt-3 text-xl font-black tracking-tight text-nexus-white sm:text-2xl"
              >
                Active RFQ Package
              </h3>

              <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
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
        </ExecutivePanel>

        <ExecutivePanel
          className="mt-8"
          variant="operational"
          padding="md"
          tone="gold"
        >
          <section aria-labelledby="rfq-addenda-workspace-title">
            <div className="mb-6 min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
                RFQ Addenda &amp; Clarifications
              </p>

              <h3
                id="rfq-addenda-workspace-title"
                className="mt-3 text-xl font-black tracking-tight text-nexus-white sm:text-2xl"
              >
                Revisions, Bulletins &amp; Supplier Acknowledgements
              </h3>

              <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
                Manage issued addenda and supplier acknowledgements within the
                same controlled RFQ workspace while preserving the existing
                document and governance workflows.
              </p>
            </div>

            {isOwner && companyId ? (
              <RFQAddendaManager
                rfqId={rfqId}
                companyId={companyId}
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
          </section>
        </ExecutivePanel>
      </section>
    </ExecutivePanel>
  );
}