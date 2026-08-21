import { ExecutiveActionAnchor } from "@/components/executive/actions/executive-action-anchor";
import { ExecutiveActionLink } from "@/components/executive/actions/executive-action-link";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type RFQExecutiveActionsProps = {
  rfqSlug: string;
  isOwner: boolean;
  isOpen: boolean;
  canSubmitQuote: boolean;
  hasCompany: boolean;
  hasMyQuote: boolean;
  deadlinePassed: boolean;
  commercialEvaluationUnlocked: boolean;
};

export function RFQExecutiveActions({
  rfqSlug,
  isOwner,
  isOpen,
  canSubmitQuote,
  hasCompany,
  hasMyQuote,
  deadlinePassed,
  commercialEvaluationUnlocked,
}: RFQExecutiveActionsProps) {
  return (
    <ExecutivePanel
      data-rfq-priority-actions="true"
      className="min-w-0"
      padding="lg"
      tone="gold"
    >
      <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
        CEO Action Center
      </p>

      <h2 className="mt-3 text-3xl font-black text-nexus-white">
        Priority Actions
      </h2>

      <div className="mt-6 grid min-w-0 gap-3">
        {canSubmitQuote ? (
          <ExecutiveActionLink
            href={`/rfq/${rfqSlug}/submit`}
            label="Submit Quote"
          />
        ) : null}

        {isOwner && isOpen ? (
          <ExecutiveActionAnchor
            href="#supplier-invitations"
            label="Invite Suppliers"
          />
        ) : null}

        {isOwner && hasCompany ? (
          <ExecutiveActionAnchor
            href="#document-center"
            label="Upload Documents"
          />
        ) : null}

        <ExecutiveActionAnchor
          href="#document-center"
          label="Review Document Center"
        />

        {isOwner && commercialEvaluationUnlocked ? (
          <ExecutiveActionLink
            href={`/rfq/${rfqSlug}/compare`}
            label="Open Compare View"
          />
        ) : null}

        {isOwner && !commercialEvaluationUnlocked ? (
          <ExecutivePanel variant="operational" padding="sm" tone="gold">
            <p className="text-sm font-black leading-6 text-nexus-gold">
              Commercial evaluation is locked until the deadline.
            </p>
          </ExecutivePanel>
        ) : null}

        {!isOwner && hasMyQuote ? (
          <ExecutivePanel variant="operational" padding="sm" tone="success">
            <p className="text-sm font-black leading-6 text-emerald-300">
              Your company has submitted a quote.
            </p>
          </ExecutivePanel>
        ) : null}

        {!isOwner && deadlinePassed && !hasMyQuote ? (
          <ExecutivePanel variant="operational" padding="sm" tone="risk">
            <p className="text-sm font-black leading-6 text-red-300">
              RFQ deadline has passed.
            </p>
          </ExecutivePanel>
        ) : null}
      </div>
    </ExecutivePanel>
  );
}
