/**
 * Ask Nexus evidence view — projection of caller-supplied explainability.
 *
 * Projects already-authorized claim, explanation, evidence sources, and
 * limitations without inventing rationale, discovering evidence, or scoring.
 * Source links pass through resolveAskNexusTrustPolicy only.
 */

import { resolveAskNexusTrustPolicy } from "@/lib/ask-nexus/ask-nexus-trust-policy";

export type AskNexusEvidenceSourceInput = {
  id: string;
  label: string;
  detail?: string | null;
  authorizedHref?: string | null;
};

export type AskNexusEvidenceViewInput = {
  id: string;
  claim: string;
  explanation: string;
  evidence?: readonly AskNexusEvidenceSourceInput[];
  limitations?: readonly string[];
};

export type AskNexusEvidenceSource = {
  id: string;
  label: string;
  detail: string | null;
  href: string | null;
};

export type AskNexusEvidenceView = {
  id: string;
  claim: string;
  explanation: string;
  evidence: readonly AskNexusEvidenceSource[];
  limitations: readonly string[];
  evidenceStatus: "supported" | "limited";
  nonBinding: true;
};

function normalizedText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveSourceHref(authorizedHref: string | null | undefined): string | null {
  const trust = resolveAskNexusTrustPolicy({
    kind: "navigate",
    authorizedNavigationHref: authorizedHref ?? null,
  });

  if (
    trust.allowed === true &&
    trust.status === "navigation_ready" &&
    trust.authorizedNavigationHref !== null
  ) {
    return trust.authorizedNavigationHref;
  }

  return null;
}

function normalizeEvidenceSources(
  sources: readonly AskNexusEvidenceSourceInput[] | undefined,
): AskNexusEvidenceSource[] {
  if (!sources) return [];

  const seenIds = new Set<string>();
  const normalized: AskNexusEvidenceSource[] = [];

  for (const source of sources) {
    const id = normalizedText(source.id);
    const label = normalizedText(source.label);
    if (!id || !label) continue;
    if (seenIds.has(id)) continue;

    seenIds.add(id);
    normalized.push({
      id,
      label,
      detail: normalizedText(source.detail ?? null),
      href: resolveSourceHref(source.authorizedHref),
    });
  }

  return normalized;
}

function normalizeLimitations(
  limitations: readonly string[] | undefined,
): string[] {
  if (!limitations) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const limitation of limitations) {
    const text = normalizedText(limitation);
    if (!text) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    normalized.push(text);
  }

  return normalized;
}

/**
 * Project a caller-supplied “Why is this flagged?” evidence view.
 * Returns null when id, claim, or explanation is missing after trim.
 */
export function resolveAskNexusEvidenceView(
  input: AskNexusEvidenceViewInput,
): AskNexusEvidenceView | null {
  const id = normalizedText(input.id);
  const claim = normalizedText(input.claim);
  const explanation = normalizedText(input.explanation);

  if (!id || !claim || !explanation) {
    return null;
  }

  const evidence = normalizeEvidenceSources(input.evidence);
  const limitations = normalizeLimitations(input.limitations);
  const evidenceStatus =
    evidence.length > 0 && limitations.length === 0 ? "supported" : "limited";

  return {
    id,
    claim,
    explanation,
    evidence,
    limitations,
    evidenceStatus,
    nonBinding: true,
  };
}
