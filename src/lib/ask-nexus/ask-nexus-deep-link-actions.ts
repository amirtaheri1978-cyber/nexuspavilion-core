/**
 * Ask Nexus deep-link actions — projection of caller-authorized destinations.
 *
 * Every href must come from caller-supplied authorizedHref and pass through
 * resolveAskNexusTrustPolicy. This module never synthesizes routes, never
 * executes navigation, and never infers authorization from kind/id/label.
 */

import { resolveAskNexusTrustPolicy } from "@/lib/ask-nexus/ask-nexus-trust-policy";

export type AskNexusDeepLinkKind =
  | "bid_rules"
  | "rfi"
  | "compliance"
  | "source_evidence"
  | "other";

export type AskNexusDeepLinkInput = {
  id: string;
  label: string;
  kind: AskNexusDeepLinkKind;
  authorizedHref: string | null;
};

export type AskNexusDeepLinkAction = {
  id: string;
  label: string;
  kind: AskNexusDeepLinkKind;
  href: string;
  allowed: true;
  status: "navigation_ready";
};

function normalizedText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Project caller-supplied authorized destinations into navigation-ready actions.
 * Returns metadata only; callers own actual navigation invocation.
 */
export function resolveAskNexusDeepLinkActions(
  inputs: readonly AskNexusDeepLinkInput[],
): readonly AskNexusDeepLinkAction[] {
  const seenIds = new Set<string>();
  const actions: AskNexusDeepLinkAction[] = [];

  for (const input of inputs) {
    const id = normalizedText(input.id);
    const label = normalizedText(input.label);
    if (!id || !label) continue;
    if (seenIds.has(id)) continue;

    const trust = resolveAskNexusTrustPolicy({
      kind: "navigate",
      authorizedNavigationHref: input.authorizedHref,
    });

    if (
      trust.allowed !== true ||
      trust.status !== "navigation_ready" ||
      trust.authorizedNavigationHref === null
    ) {
      continue;
    }

    seenIds.add(id);
    actions.push({
      id,
      label,
      kind: input.kind,
      href: trust.authorizedNavigationHref,
      allowed: true,
      status: "navigation_ready",
    });
  }

  return actions;
}
