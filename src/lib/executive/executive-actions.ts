import type {
  ExecutiveAction,
  ExecutiveIntelligenceInput,
  ExecutiveReadiness,
  ExecutiveResult,
  ExecutiveSupplierRecommendationResult,
} from "@/lib/executive/executive-types";

function getPriorityRank(
  priority: ExecutiveAction["priority"],
): number {
  if (priority === "critical") return 1;
  if (priority === "high") return 2;
  if (priority === "medium") return 3;

  return 4;
}

export function buildExecutiveActions(
  {
    rfqSlug,
    isOwner,
    isOpen,
    commercialEvaluationUnlocked,
    quoteCount,
    documentCount,
    addendaCount,
    recommendedQuote,
  }: ExecutiveIntelligenceInput,
  readiness: ExecutiveReadiness,
  recommendation: ExecutiveResult,
  supplierRecommendation: ExecutiveSupplierRecommendationResult,
): ExecutiveAction[] {
  const actions: ExecutiveAction[] = [];

  if (!isOwner) {
    if (documentCount > 0) {
      actions.push({
        title: "Review RFQ Documents",
        priority: "high",
        category: "Supplier Readiness",
        rationale:
          "The buyer has provided RFQ documents that should be reviewed before submitting or validating pricing.",
        outcome:
          "Improves proposal accuracy and reduces scope assumptions.",
        anchorHref: "#document-center",
        actionLabel: "Open Documents",
      });
    }

    if (addendaCount > 0) {
      actions.push({
        title: "Acknowledge Issued Addenda",
        priority: "critical",
        category: "Compliance",
        rationale:
          "Issued addenda may contain clarifications, revisions, or updated instructions that affect your submission.",
        outcome:
          "Keeps your company aligned with the latest RFQ requirements.",
        anchorHref: "#document-center",
        actionLabel: "Review Addenda",
      });
    }

    if (isOpen) {
      actions.push({
        title: "Submit Commercial Proposal",
        priority: "high",
        category: "Submission",
        rationale:
          "The RFQ is still accepting supplier submissions. Submit before the deadline to remain eligible.",
        outcome:
          "Completes your company’s supplier-side participation in the RFQ.",
        href: `/rfq/${rfqSlug}/submit`,
        actionLabel: "Submit Quote",
      });
    }

    if (actions.length === 0) {
      actions.push({
        title: "Monitor RFQ Workspace",
        priority: "low",
        category: "Supplier Visibility",
        rationale:
          "There are no urgent supplier-side actions currently available.",
        outcome:
          "Keeps your company aware of documents, addenda, and RFQ status changes.",
        anchorHref: "#document-center",
        actionLabel: "Review Workspace",
      });
    }

    return actions.sort(
      (firstAction, secondAction) =>
        getPriorityRank(firstAction.priority) -
        getPriorityRank(secondAction.priority),
    );
  }

  if (documentCount === 0) {
    actions.push({
      title: "Upload RFQ Document Package",
      priority: "critical",
      category: "Documentation",
      rationale:
        "Suppliers need drawings, specifications, BOQ, photos, or supporting files before they can price with confidence.",
      outcome:
        "Improves supplier clarity, reduces assumptions, and strengthens award readiness.",
      anchorHref: "#document-center",
      actionLabel: "Open Document Center",
    });
  }

  if (isOpen && quoteCount === 0) {
    actions.push({
      title: "Invite Qualified Suppliers",
      priority: "critical",
      category: "Competition",
      rationale:
        "No supplier quotes have been received. The RFQ needs bid coverage before commercial comparison can produce decision-grade intelligence.",
      outcome:
        "Creates supplier competition and improves the probability of a credible award recommendation.",
      anchorHref: "#supplier-invitations",
      actionLabel: "Invite Suppliers",
    });
  }

  if (isOpen && quoteCount > 0 && quoteCount < 3) {
    actions.push({
      title: "Increase Supplier Competition",
      priority: "high",
      category: "Market Coverage",
      rationale:
        "Current bid coverage limits commercial leverage and should be strengthened before final award validation.",
      outcome:
        "Improves competition, negotiation leverage, and executive decision confidence.",
      anchorHref: "#supplier-invitations",
      actionLabel: "Invite More Suppliers",
    });
  }

  if (documentCount > 0 && addendaCount === 0) {
    actions.push({
      title: "Monitor Scope Clarifications",
      priority: "medium",
      category: "Governance",
      rationale:
        "No addenda have been issued. Supplier questions and scope clarifications should be governed through the formal addenda workflow when required.",
      outcome:
        "Maintains an auditable clarification record and consistent information distribution across suppliers.",
      anchorHref: "#document-center",
      actionLabel: "Review Addenda",
    });
  }

  if (!commercialEvaluationUnlocked) {
    actions.push({
      title: "Maintain Blind Bidding Control",
      priority: "medium",
      category: "Commercial Governance",
      rationale:
        "Commercial data remains protected until the authorized opening stage.",
      outcome:
        "Preserves bid confidentiality, controlled evaluation, and procurement integrity.",
      anchorHref: "#quote-intelligence",
      actionLabel: "Review Lockbox",
    });
  }

  if (commercialEvaluationUnlocked && recommendedQuote) {
    const recommendedSupplier =
      supplierRecommendation.recommendedSupplier;

    actions.push({
      title: "Validate Recommended Award Path",
      priority: recommendation.priority,
      category: "Award Decision",
      rationale: recommendedSupplier
        ? `${recommendedSupplier.supplierName} is the current supplier recommendation with ${recommendedSupplier.confidence} decision confidence. ${recommendation.recommendation}`
        : `A commercial award recommendation is available. ${recommendation.recommendation}`,
      outcome:
        "Moves the RFQ from commercial evaluation toward authorized executive award validation.",
      href: `/rfq/${rfqSlug}/compare`,
      actionLabel: "Open Compare View",
    });
  }

  if (readiness.tone !== "success") {
    actions.push({
      title: "Resolve Executive Readiness Gaps",
      priority: readiness.priority,
      category: "Decision Readiness",
      rationale: readiness.recommendation,
      outcome:
        "Strengthens the operating evidence and governance controls required for an authorized award decision.",
      anchorHref: "#document-center",
      actionLabel: "Improve Readiness",
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: "Workspace Ready for Executive Review",
      priority: "low",
      category: "Executive Review",
      rationale:
        "No urgent corrective action is currently required. The procurement workspace should remain under active executive monitoring until award authorization.",
      outcome:
        "Maintains decision visibility while preserving supplier, document, governance, and commercial oversight.",
      anchorHref: "#quote-intelligence",
      actionLabel: "Review Workspace",
    });
  }

  return actions.sort(
    (firstAction, secondAction) =>
      getPriorityRank(firstAction.priority) -
      getPriorityRank(secondAction.priority),
  );
}