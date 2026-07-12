import "server-only";

import {
  type AccessibleRfq,
  type ProcurementQuote,
  type ProcurementRfq,
  type ProcurementRfqInvite,
  isOpenRfqStatus,
  resolveSupplierRfqAccess,
} from "@/lib/procurement/rfq-access-contract";
import {
  type ProcurementExperienceResolution,
  resolveProcurementExperience,
} from "@/lib/experience/resolve-procurement-experience";
import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

type ProcurementProfile = {
  id: string;
  company_id: string | null;
  role: string | null;
  email: string | null;
};

type ProcurementCompany = {
  id: string;
  network_role: string | null;
};

export type ProcurementContextIdentity = {
  userId: string;
  email: string;
  companyId: string | null;
  profileRole: string | null;
  companyNetworkRole: string | null;
};

export type BuyerProcurementContext = {
  ownedRfqs: ProcurementRfq[];
  openOwnedRfqs: ProcurementRfq[];
  receivedQuotes: ProcurementQuote[];
  pendingEvaluations: ProcurementRfq[];
  issuedAwards: ProcurementQuote[];
};

export type SupplierProcurementContext = {
  accessibleOpportunities: AccessibleRfq[];
  openOpportunities: AccessibleRfq[];
  submittedQuotes: ProcurementQuote[];
  pendingDecisions: ProcurementQuote[];
  awardedQuotes: ProcurementQuote[];
  unsuccessfulQuotes: ProcurementQuote[];
  directlyInvitedRfqIds: Set<string>;
  companyInvitedRfqIds: Set<string>;
  participatedRfqIds: Set<string>;
};

export type ProcurementContextDiagnostics = {
  source: "procurement-context-repository";
  buyerRfqCount: number;
  supplierCandidateRfqCount: number;
  supplierAccessibleRfqCount: number;
  supplierSubmittedQuoteCount: number;
  directInviteCount: number;
  companyInviteCount: number;
};

export type ProcurementContext = {
  identity: ProcurementContextIdentity;
  experience: ProcurementExperienceResolution;
  buyer: BuyerProcurementContext;
  supplier: SupplierProcurementContext;
  diagnostics: ProcurementContextDiagnostics;
};

export class ProcurementContextError extends Error {
  constructor(
    message: string,
    readonly causeDetails?: unknown,
  ) {
    super(message);
    this.name = "ProcurementContextError";
  }
}

function normalizeEmail(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function isPendingDecision(decision: string | null) {
  const normalizedDecision = String(decision ?? "")
    .trim()
    .toLowerCase();

  return normalizedDecision === "" || normalizedDecision === "pending";
}

function isAwardedDecision(decision: string | null) {
  return String(decision ?? "").trim().toLowerCase() === "awarded";
}

function isUnsuccessfulDecision(decision: string | null) {
  const normalizedDecision = String(decision ?? "")
    .trim()
    .toLowerCase();

  return (
    normalizedDecision === "rejected" ||
    normalizedDecision === "not_awarded"
  );
}

async function loadProfile(
  supabase: ServerSupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, company_id, role, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new ProcurementContextError(
      "Unable to load the authenticated procurement profile.",
      error,
    );
  }

  return data as ProcurementProfile | null;
}

async function loadCompany(
  supabase: ServerSupabaseClient,
  companyId: string | null,
) {
  if (!companyId) return null;

  const { data, error } = await supabase
    .from("companies")
    .select("id, network_role")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    throw new ProcurementContextError(
      "Unable to load the current procurement company.",
      error,
    );
  }

  return data as ProcurementCompany | null;
}

async function loadOwnedRfqs(
  supabase: ServerSupabaseClient,
  companyId: string | null,
) {
  if (!companyId) return [];

  const { data, error } = await supabase
    .from("rfqs")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ProcurementContextError(
      "Unable to load company-owned RFQs.",
      error,
    );
  }

  return (data ?? []) as ProcurementRfq[];
}

async function loadSupplierCandidateRfqs(
  supabase: ServerSupabaseClient,
) {
  const { data, error } = await supabase
    .from("rfqs")
    .select("*")
    .or("status.eq.open,status.is.null")
    .order("created_at", { ascending: false });

  if (error) {
    throw new ProcurementContextError(
      "Unable to load supplier RFQ opportunities.",
      error,
    );
  }

  return (data ?? []) as ProcurementRfq[];
}

async function loadDirectInvites(
  supabase: ServerSupabaseClient,
  email: string,
) {
  if (!email) return [];

  const { data, error } = await supabase
    .from("rfq_invites")
    .select("rfq_id, email, status")
    .ilike("email", email);

  if (error) {
    throw new ProcurementContextError(
      "Unable to load direct RFQ invitations.",
      error,
    );
  }

  return (data ?? []) as ProcurementRfqInvite[];
}

async function loadSupplierQuotes(
  supabase: ServerSupabaseClient,
  companyId: string | null,
) {
  if (!companyId) return [];

  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ProcurementContextError(
      "Unable to load supplier-submitted quotations.",
      error,
    );
  }

  return (data ?? []) as ProcurementQuote[];
}

async function loadReceivedQuotes(
  supabase: ServerSupabaseClient,
  ownedRfqIds: string[],
) {
  if (ownedRfqIds.length === 0) return [];

  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .in("rfq_id", ownedRfqIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ProcurementContextError(
      "Unable to load quotations received on company RFQs.",
      error,
    );
  }

  return (data ?? []) as ProcurementQuote[];
}

function buildBuyerContext(
  ownedRfqs: ProcurementRfq[],
  receivedQuotes: ProcurementQuote[],
): BuyerProcurementContext {
  const openOwnedRfqs = ownedRfqs.filter((rfq) =>
    isOpenRfqStatus(rfq.status),
  );

  const quoteRfqIds = new Set(
    receivedQuotes.map((quote) => quote.rfq_id),
  );

  const pendingEvaluations = openOwnedRfqs.filter((rfq) =>
    quoteRfqIds.has(rfq.id),
  );

  const issuedAwards = receivedQuotes.filter((quote) =>
    isAwardedDecision(quote.decision),
  );

  return {
    ownedRfqs,
    openOwnedRfqs,
    receivedQuotes,
    pendingEvaluations,
    issuedAwards,
  };
}

function buildSupplierContext({
  candidateRfqs,
  submittedQuotes,
  directInvites,
  currentCompanyId,
}: {
  candidateRfqs: ProcurementRfq[];
  submittedQuotes: ProcurementQuote[];
  directInvites: ProcurementRfqInvite[];
  currentCompanyId: string | null;
}): SupplierProcurementContext {
  const directlyInvitedRfqIds = new Set(
    directInvites.map((invite) => invite.rfq_id),
  );

  const companyInvitedRfqIds = new Set<string>();

  const participatedRfqIds = new Set(
    submittedQuotes.map((quote) => quote.rfq_id),
  );

  const accessibleOpportunities = candidateRfqs
    .map((rfq) =>
      resolveSupplierRfqAccess({
        rfq,
        currentCompanyId,
        directlyInvitedRfqIds,
        companyInvitedRfqIds,
        participatedRfqIds,
      }),
    )
    .filter((item): item is AccessibleRfq => item !== null);

  const pendingDecisions = submittedQuotes.filter((quote) =>
    isPendingDecision(quote.decision),
  );

  const awardedQuotes = submittedQuotes.filter((quote) =>
    isAwardedDecision(quote.decision),
  );

  const unsuccessfulQuotes = submittedQuotes.filter((quote) =>
    isUnsuccessfulDecision(quote.decision),
  );

  return {
    accessibleOpportunities,
    openOpportunities: accessibleOpportunities,
    submittedQuotes,
    pendingDecisions,
    awardedQuotes,
    unsuccessfulQuotes,
    directlyInvitedRfqIds,
    companyInvitedRfqIds,
    participatedRfqIds,
  };
}

export async function getProcurementContext(): Promise<ProcurementContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new ProcurementContextError(
      "Unable to resolve the authenticated procurement user.",
      userError,
    );
  }

  if (!user) {
    throw new ProcurementContextError(
      "An authenticated user is required to load procurement context.",
    );
  }

  const profile = await loadProfile(supabase, user.id);
  const company = await loadCompany(
    supabase,
    profile?.company_id ?? null,
  );

  const identity: ProcurementContextIdentity = {
    userId: user.id,
    email: normalizeEmail(user.email ?? profile?.email),
    companyId: profile?.company_id ?? null,
    profileRole: profile?.role ?? null,
    companyNetworkRole: company?.network_role ?? null,
  };

  const experience = resolveProcurementExperience({
    profileRole: identity.profileRole,
    companyNetworkRole: identity.companyNetworkRole,
  });

  const [
    ownedRfqs,
    supplierCandidateRfqs,
    directInvites,
    supplierSubmittedQuotes,
  ] = await Promise.all([
    loadOwnedRfqs(supabase, identity.companyId),
    loadSupplierCandidateRfqs(supabase),
    loadDirectInvites(supabase, identity.email),
    loadSupplierQuotes(supabase, identity.companyId),
  ]);

  const receivedQuotes = await loadReceivedQuotes(
    supabase,
    ownedRfqs.map((rfq) => rfq.id),
  );

  const buyer = buildBuyerContext(ownedRfqs, receivedQuotes);

  const supplier = buildSupplierContext({
    candidateRfqs: supplierCandidateRfqs,
    submittedQuotes: supplierSubmittedQuotes,
    directInvites,
    currentCompanyId: identity.companyId,
  });

  return {
    identity,
    experience,
    buyer,
    supplier,
    diagnostics: {
      source: "procurement-context-repository",
      buyerRfqCount: buyer.ownedRfqs.length,
      supplierCandidateRfqCount: supplierCandidateRfqs.length,
      supplierAccessibleRfqCount:
        supplier.accessibleOpportunities.length,
      supplierSubmittedQuoteCount: supplier.submittedQuotes.length,
      directInviteCount: supplier.directlyInvitedRfqIds.size,
      companyInviteCount: supplier.companyInvitedRfqIds.size,
    },
  };
}