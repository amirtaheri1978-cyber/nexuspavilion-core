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

type LifecycleStage = {
  label: string;
  href: string;
  external?: boolean;
};

function buildIssuerLifecycleStages(): LifecycleStage[] {
  return [
    {
      label: "Drafting & Configuration",
      href: "#document-center",
    },
    {
      label: "Market Engagement & Publishing",
      href: "#supplier-invitations",
    },
    {
      label: "Clarifications & Addenda",
      href: "#clarifications-addenda",
    },
    {
      label: "Evaluation & Award",
      href: "#quote-intelligence",
    },
  ];
}

function buildRespondentLifecycleStages(
  rfqSlug: string,
  canSubmitQuote: boolean,
): LifecycleStage[] {
  return [
    {
      label: "RFQ Review & Scoping",
      href: "#procurement-context",
    },
    {
      label: "Clarifications & Addenda",
      href: "#clarifications-addenda",
    },
    {
      label: "Quote & Proposal Preparation",
      href: canSubmitQuote
        ? `/rfq/${rfqSlug}/submit`
        : "#quote-intelligence",
      external: canSubmitQuote,
    },
    {
      label: "Submission & Award Tracking",
      href: "#quote-intelligence",
    },
  ];
}

function LifecycleStageLink({
  stage,
  index,
}: {
  stage: LifecycleStage;
  index: number;
}) {
  const label = `${index + 1}. ${stage.label}`;

  if (stage.external) {
    return <ExecutiveActionLink href={stage.href} label={label} />;
  }

  return <ExecutiveActionAnchor href={stage.href} label={label} />;
}

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
  const lifecycleStages = isOwner
    ? buildIssuerLifecycleStages()
    : buildRespondentLifecycleStages(rfqSlug, canSubmitQuote);

  return (
    <ExecutivePanel
      data-rfq-priority-actions="true"
      className="min-w-0"
      padding="lg"
      tone="gold"
    >
      <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
        Procurement lifecycle
      </p>

      <h2 className="mt-3 text-3xl font-black text-nexus-white">
        {isOwner ? "Issuer workflow" : "Respondent workflow"}
      </h2>

      <nav
        className="mt-6 grid min-w-0 gap-3"
        aria-label={
          isOwner
            ? "Issuer procurement lifecycle navigation"
            : "Respondent procurement lifecycle navigation"
        }
        data-rfq-lifecycle-nav="true"
      >
        {lifecycleStages.map((stage, index) => (
          <LifecycleStageLink
            key={stage.label}
            stage={stage}
            index={index}
          />
        ))}
      </nav>

      <p className="mt-8 text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
        Priority actions
      </p>

      <div className="mt-4 grid min-w-0 gap-3">
        {canSubmitQuote ? (
          <ExecutiveActionLink
            href={`/rfq/${rfqSlug}/submit`}
            label="Submit quote"
          />
        ) : null}

        {isOwner && isOpen ? (
          <ExecutiveActionAnchor
            href="#supplier-invitations"
            label="Invite respondents"
          />
        ) : null}

        {isOwner && hasCompany ? (
          <ExecutiveActionAnchor
            href="#document-center"
            label="Upload documents"
          />
        ) : null}

        <ExecutiveActionAnchor
          href="#document-center"
          label="Review procurement package"
        />

        {isOwner && commercialEvaluationUnlocked ? (
          <ExecutiveActionLink
            href={`/rfq/${rfqSlug}/compare`}
            label="Open quote comparison"
          />
        ) : null}

        {isOwner && !commercialEvaluationUnlocked ? (
          <ExecutivePanel variant="operational" padding="sm" tone="gold">
            <p className="text-sm font-black leading-6 text-nexus-gold">
              Quote evaluation is locked until the submission deadline.
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
