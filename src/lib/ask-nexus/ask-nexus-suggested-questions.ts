/**
 * Ask Nexus suggested questions — deterministic, context-derived only.
 *
 * Builds a small fixed set of suggested questions from already-authorized
 * Ask Nexus context. Never fetches data, never infers permissions, and never
 * generates routes or consequential-action prompts.
 */

import type { AskNexusAuthorizedContext } from "@/lib/ask-nexus/ask-nexus-context";

export type AskNexusSuggestedQuestionIntent =
  | "next_step"
  | "change"
  | "incomplete"
  | "explain";

export type AskNexusSuggestedQuestion = {
  id: string;
  label: string;
  intent: AskNexusSuggestedQuestionIntent;
};

const MAX_SUGGESTED_QUESTIONS = 4;

const INTENT_ORDER: readonly AskNexusSuggestedQuestionIntent[] = [
  "next_step",
  "change",
  "incomplete",
  "explain",
] as const;

function hasPageOrWorkflowLabel(context: AskNexusAuthorizedContext): boolean {
  return Boolean(context.pageLabel || context.workflowLabel);
}

function resolveExplainQuestion(
  context: AskNexusAuthorizedContext,
): AskNexusSuggestedQuestion | null {
  if (context.rfq) {
    return {
      id: "explain-rfq",
      label: "Explain this RFQ.",
      intent: "explain",
    };
  }

  if (context.project) {
    return {
      id: "explain-project",
      label: "Explain this project.",
      intent: "explain",
    };
  }

  if (context.company) {
    return {
      id: "explain-company",
      label: "Explain this company.",
      intent: "explain",
    };
  }

  return null;
}

/**
 * Resolve a deterministic set of suggested questions from authorized context.
 */
export function resolveAskNexusSuggestedQuestions(
  context: AskNexusAuthorizedContext,
): readonly AskNexusSuggestedQuestion[] {
  const candidates: AskNexusSuggestedQuestion[] = [];

  if (hasPageOrWorkflowLabel(context)) {
    candidates.push({
      id: "next-step",
      label: "What should I do next?",
      intent: "next_step",
    });
  }

  if (context.facts.length > 0) {
    candidates.push({
      id: "what-changed",
      label: "What changed?",
      intent: "change",
    });
    candidates.push({
      id: "what-is-incomplete",
      label: "What is incomplete?",
      intent: "incomplete",
    });
  }

  const explainQuestion = resolveExplainQuestion(context);
  if (explainQuestion) {
    candidates.push(explainQuestion);
  }

  const seenIds = new Set<string>();
  const ordered: AskNexusSuggestedQuestion[] = [];

  for (const intent of INTENT_ORDER) {
    for (const question of candidates) {
      if (question.intent !== intent) continue;
      if (seenIds.has(question.id)) continue;
      seenIds.add(question.id);
      ordered.push(question);
      if (ordered.length >= MAX_SUGGESTED_QUESTIONS) {
        return ordered;
      }
    }
  }

  return ordered;
}
