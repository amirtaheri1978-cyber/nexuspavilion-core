/**
 * Ask Nexus authorized context contract — pure projection only.
 *
 * Accepts caller-supplied, already-authorized page/workflow context.
 * Never discovers resources, never fetches data, and never infers access
 * from labels, facts, roles, or model output.
 */

export const ASK_NEXUS_CONTEXT_DOMAINS = [
  "company",
  "project",
  "rfq",
] as const;

export type AskNexusContextDomain = (typeof ASK_NEXUS_CONTEXT_DOMAINS)[number];

export type AskNexusContextFactInput = {
  key: string;
  label: string;
  value: string;
};

export type AskNexusContextResourceInput = {
  id: string;
  label?: string | null;
};

export type AskNexusContextRfqInput = AskNexusContextResourceInput & {
  authorizedHref?: string | null;
};

export type AskNexusContextInput = {
  pageLabel?: string | null;
  workflowLabel?: string | null;
  company?: AskNexusContextResourceInput | null;
  project?: AskNexusContextResourceInput | null;
  rfq?: AskNexusContextRfqInput | null;
  facts?: readonly AskNexusContextFactInput[];
  authorizedDomains?: readonly AskNexusContextDomain[];
};

export type AskNexusAuthorizedResource = {
  id: string;
  label: string | null;
};

export type AskNexusAuthorizedRfqResource = AskNexusAuthorizedResource & {
  authorizedHref: string | null;
};

export type AskNexusAuthorizedFact = {
  key: string;
  label: string;
  value: string;
};

export type AskNexusAuthorizedContext = {
  pageLabel: string | null;
  workflowLabel: string | null;
  company: AskNexusAuthorizedResource | null;
  project: AskNexusAuthorizedResource | null;
  rfq: AskNexusAuthorizedRfqResource | null;
  facts: readonly AskNexusAuthorizedFact[];
  authorizedDomains: readonly AskNexusContextDomain[];
};

function isAskNexusContextDomain(
  value: string,
): value is AskNexusContextDomain {
  return (ASK_NEXUS_CONTEXT_DOMAINS as readonly string[]).includes(value);
}

function normalizedOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizedRequiredText(value: string | null | undefined): string | null {
  return normalizedOptionalText(value);
}

function normalizeAuthorizedDomains(
  domains: readonly AskNexusContextDomain[] | undefined,
): readonly AskNexusContextDomain[] {
  if (!domains || domains.length === 0) return [];

  const seen = new Set<AskNexusContextDomain>();
  const result: AskNexusContextDomain[] = [];

  for (const domain of domains) {
    if (!isAskNexusContextDomain(domain) || seen.has(domain)) continue;
    seen.add(domain);
    result.push(domain);
  }

  return result;
}

function domainAuthorized(
  authorizedDomains: readonly AskNexusContextDomain[],
  domain: AskNexusContextDomain,
): boolean {
  return authorizedDomains.includes(domain);
}

function normalizeResource(
  resource: AskNexusContextResourceInput | null | undefined,
): AskNexusAuthorizedResource | null {
  if (!resource) return null;

  const id = normalizedRequiredText(resource.id);
  if (!id) return null;

  return {
    id,
    label: normalizedOptionalText(resource.label),
  };
}

function normalizeRfqResource(
  resource: AskNexusContextRfqInput | null | undefined,
): AskNexusAuthorizedRfqResource | null {
  const base = normalizeResource(resource);
  if (!base || !resource) return null;

  return {
    ...base,
    authorizedHref: normalizedOptionalText(resource.authorizedHref),
  };
}

function normalizeFacts(
  facts: readonly AskNexusContextFactInput[] | undefined,
): readonly AskNexusAuthorizedFact[] {
  if (!facts || facts.length === 0) return [];

  const seenKeys = new Set<string>();
  const result: AskNexusAuthorizedFact[] = [];

  for (const fact of facts) {
    const key = normalizedRequiredText(fact.key);
    const label = normalizedRequiredText(fact.label);
    const value = normalizedRequiredText(fact.value);

    if (!key || !label || !value) continue;
    if (seenKeys.has(key)) continue;

    seenKeys.add(key);
    result.push({ key, label, value });
  }

  return result;
}

/**
 * Project already-authorized caller context into a safe Ask Nexus context.
 * Does not query systems or broaden access beyond authorizedDomains.
 */
export function resolveAskNexusAuthorizedContext(
  input: AskNexusContextInput,
): AskNexusAuthorizedContext {
  const authorizedDomains = normalizeAuthorizedDomains(input.authorizedDomains);

  return {
    pageLabel: normalizedOptionalText(input.pageLabel),
    workflowLabel: normalizedOptionalText(input.workflowLabel),
    company: domainAuthorized(authorizedDomains, "company")
      ? normalizeResource(input.company)
      : null,
    project: domainAuthorized(authorizedDomains, "project")
      ? normalizeResource(input.project)
      : null,
    rfq: domainAuthorized(authorizedDomains, "rfq")
      ? normalizeRfqResource(input.rfq)
      : null,
    facts: normalizeFacts(input.facts),
    authorizedDomains,
  };
}
