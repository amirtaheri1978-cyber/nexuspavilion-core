import type { ComponentProps } from "react";

import RFQAddendaManager from "@/components/rfq-addenda-manager";
import RFQAddendumAcknowledgementCenter from "@/components/rfq-addendum-acknowledgement-center";
import RFQDocumentLibrary from "@/components/rfq-document-library";
import RFQDocumentUpload from "@/components/rfq-document-upload";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";

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
  return (
    <ExecutivePanel
      id="document-center"
      className="mt-8"
      padding="lg"
      tone="blue"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
            Executive Document Center
          </p>

          <h2 className="mt-3 text-3xl font-black text-nexus-white sm:text-4xl">
            Procurement Package Control Room
          </h2>

          <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
            A single controlled environment for drawings, specifications,
            BOQ files, photos, supporting documents, addenda, supplier
            acknowledgements, and procurement package governance.
          </p>
        </div>

        <div className="grid min-w-full gap-3 sm:grid-cols-2 xl:min-w-[520px] xl:grid-cols-[1fr_1fr_1.2fr]">
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
    label="Role"
    value={isOwner ? "Buyer" : "Supplier"}
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
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#9BE8F8]">
              Upload Center
            </p>

            <h3 className="mt-3 text-2xl font-black text-nexus-white">
              Upload RFQ Documents
            </h3>

            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
              Add drawings, specifications, BOQ files, site photos,
              clarifications, and supporting documents to the live RFQ
              workspace. Uploading here keeps the supplier-facing package
              current without changing the RFQ creation wizard.
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
              description="Technical specifications, MasterFormat sections, product requirements, or scope specs."
            />

            <RFQDocumentUpload
              rfqId={rfqId}
              companyId={companyId}
              attachmentType="boq"
              title="Upload BOQ"
              description="Bill of quantities, bid forms, Excel pricing sheets, or quantity takeoff documents."
            />

            <RFQDocumentUpload
              rfqId={rfqId}
              companyId={companyId}
              attachmentType="photo"
              title="Upload Photos"
              description="Site photos, existing conditions, reference images, or project context photos."
            />

            <RFQDocumentUpload
              rfqId={rfqId}
              companyId={companyId}
              attachmentType="addenda"
              title="Upload Addenda"
              description="Clarifications, addenda, revisions, bulletins, or updated RFQ instructions."
            />

            <RFQDocumentUpload
              rfqId={rfqId}
              companyId={companyId}
              attachmentType="supporting"
              title="Upload Supporting Documents"
              description="Schedules, reports, forms, calculations, compliance documents, or other files."
            />
          </div>
        </ExecutivePanel>
      ) : null}

      <ExecutivePanel
        className="mt-8"
        variant="operational"
        padding="md"
        tone="gold"
      >
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
            Document Library
          </p>

          <h3 className="mt-3 text-2xl font-black text-nexus-white">
            Active RFQ Package
          </h3>

          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
            Review all available RFQ files, drawings, specifications, BOQ
            documents, photos, and supporting materials connected to this
            procurement workspace.
          </p>
        </div>

        <RFQDocumentLibrary
          rfqId={rfqId}
          initialDocuments={documents}
          canManage={isOwner}
        />
      </ExecutivePanel>

      <ExecutivePanel
        className="mt-8"
        variant="operational"
        padding="md"
        tone="gold"
      >
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
            RFQ Addenda &amp; Clarifications
          </p>

          <h3 className="mt-3 text-2xl font-black text-nexus-white">
            Revisions, Bulletins &amp; Supplier Acknowledgements
          </h3>

          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
            Manage issued addenda and supplier acknowledgements from the same
            executive RFQ workspace without duplicating document workflows.
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
      </ExecutivePanel>
    </ExecutivePanel>
  );
}