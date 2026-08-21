import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const documents = readSource(
  "src/components/rfq-workspace/rfq-document-workspace.tsx",
);
const library = readSource("src/components/rfq-document-library.tsx");
const upload = readSource("src/components/rfq-document-upload.tsx");
const invite = readSource("src/components/invite-vendor-form.tsx");
const comparison = readSource(
  "src/components/rfq-workspace/rfq-quote-comparison.tsx",
);
const supplierQuotes = readSource(
  "src/components/rfq-workspace/rfq-supplier-quotes.tsx",
);
const command = readSource(
  "src/components/rfq-workspace/rfq-command-center.tsx",
);
const ranking = readSource(
  "src/components/executive/executive-opportunity-ranking.tsx",
);
const visualQa = readSource("src/app/dev/rfq-visual-qa/page.tsx");
const sidebar = readSource("src/components/sidebar.tsx");
const appShell = readSource("src/components/app-shell.tsx");
const detail = readSource("src/app/rfq/[slug]/page.tsx");

describe("Task 24-RFQ-08 document workspace density", () => {
  it("keeps upload, library, addenda, and invitation destinations intact", () => {
    expect(documents).toContain('id="document-center"');
    expect(documents).toContain("RFQDocumentUpload");
    expect(documents).toContain('attachmentType="drawing"');
    expect(documents).toContain('attachmentType="specification"');
    expect(documents).toContain('attachmentType="boq"');
    expect(documents).toContain('attachmentType="photo"');
    expect(documents).toContain('attachmentType="addenda"');
    expect(documents).toContain('attachmentType="supporting"');
    expect(documents).toContain("RFQDocumentLibrary");
    expect(documents).toContain("RFQAddendaManager");
    expect(documents).toContain("RFQAddendumAcknowledgementCenter");
    expect(documents).toContain("canManage={isOwner}");
    expect(documents).toContain("Issuing Organization");
    expect(documents).toContain("Responding Organization");
    expect(documents).toContain("ExecutiveBadge");
    expect(documents).not.toContain("RFQ Role");
    expect(upload).toContain('from("rfq-attachments")');
    expect(upload).toContain('fetch("/api/rfq-attachments"');
    expect(upload).toContain("rfq-documents-updated");
    expect(library).toContain(".from(\"rfq_attachments\")");
    expect(library).toContain(".from(\"rfq-attachments\")");
    expect(library).toContain("window.confirm");
    expect(detail).toContain('id="supplier-invitations"');
    expect(detail).toContain("InviteVendorForm");
    expect(invite).toContain('fetch("/api/invites"');
  });

  it("does not nest extra document panels or fire viewport xl grids under the shell", () => {
    expect(documents).toContain('data-rfq-document-workspace="true"');
    expect(documents).toContain("@container");
    expect(documents).toContain("@4xl:flex-row @4xl:items-start");
    expect(documents).toContain("@4xl:grid-cols-2");
    expect(documents).toContain("@sm:grid-cols-2");
    expect(documents).not.toContain("xl:flex-row xl:items-start xl:justify-between");
    expect(documents).not.toContain("xl:min-w-[520px]");
    expect(documents).not.toContain("xl:grid-cols-3");
    expect(documents).not.toContain("xl:grid-cols-[1fr_1fr_1.2fr]");
    expect(documents).not.toContain("md:grid-cols-2 xl:grid-cols-3");
    expect(documents.match(/<ExecutivePanel/g)?.length).toBe(1);
    expect(library).toContain('data-rfq-document-library="true"');
    expect(library).not.toContain("rounded-[32px]");
    expect(library).not.toContain("Construction Document Library");
  });

  it("wraps document names at word boundaries and keeps actions reachable", () => {
    expect(library).toContain("text-pretty");
    expect(library).toContain("min-w-0");
    expect(library).not.toContain("truncate");
    expect(library).not.toContain("lg:flex-row");
    expect(library).toContain("Preview");
    expect(library).toContain("Download");
    expect(library).toContain("Deleting...");
    expect(library).toContain("min-h-11");
    expect(upload).not.toContain("truncate");
    expect(upload).toContain("text-pretty");
    expect(visualQa).toContain("RFQDocumentWorkspace");
    expect(visualQa).toContain('data-rfq-document-shell-width="1110"');
    expect(visualQa).toContain(
      "North-Harbor-Refrigeration-Replacement-Commissioning-Drawings-Package-Rev-C.pdf",
    );
  });

  it("does not alter frozen Task 23 or RFQ-01 through RFQ-07 regions", () => {
    expect(appShell).toContain("lg:ml-[330px]");
    expect(sidebar).toContain("w-[330px]");
    expect(command).toContain('data-rfq-command-center="true"');
    expect(ranking).toContain('data-rfq-priority-decision="true"');
    expect(ranking).toContain('data-rfq-opportunity-queue="true"');
    expect(comparison).toContain("@min-[1500px]:block");
    expect(comparison).toContain("AwardContractButton");
    expect(supplierQuotes).toContain('data-rfq-supplier-quotes="true"');
    expect(supplierQuotes).toContain("@min-[1500px]:hidden");
  });
});
