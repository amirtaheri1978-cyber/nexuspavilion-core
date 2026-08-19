import type { SupabaseClient } from "@supabase/supabase-js";

export const PROFESSIONAL_NAME_MAX_LENGTH = 80;
export const JOB_TITLE_MAX_LENGTH = 120;

export const PROFESSIONAL_NAME_SYNC_ERROR =
  "We could not save your professional name. Please review your details and try again.";

export const PROFESSIONAL_NAME_UNAUTHENTICATED_ERROR =
  "Please sign in to continue.";

type TransitNameMetadata = {
  first_name?: unknown;
  last_name?: unknown;
};

export type ResolvedProfessionalNames = {
  firstName: string | null;
  lastName: string | null;
};

export function normalizeProfessionalName(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizeJobTitle(value: unknown) {
  return String(value ?? "").trim();
}

export function validateProfessionalName(
  value: string,
  fieldLabel: string,
  { required }: { required: boolean },
) {
  if (!value) {
    return required ? `${fieldLabel} is required.` : null;
  }

  if (value.length > PROFESSIONAL_NAME_MAX_LENGTH) {
    return `${fieldLabel} must not exceed ${PROFESSIONAL_NAME_MAX_LENGTH} characters.`;
  }

  return null;
}

export function validateFounderJobTitle(
  value: string,
  { required }: { required: boolean },
) {
  if (!value) {
    return required ? "Job title is required." : null;
  }

  if (value.length > JOB_TITLE_MAX_LENGTH) {
    return `Job title must not exceed ${JOB_TITLE_MAX_LENGTH} characters.`;
  }

  return null;
}

export function readTransitNamesFromMetadata(
  metadata: unknown,
): ResolvedProfessionalNames {
  const record =
    metadata && typeof metadata === "object"
      ? (metadata as TransitNameMetadata)
      : {};

  const firstName = normalizeProfessionalName(record.first_name);
  const lastName = normalizeProfessionalName(record.last_name);

  return {
    firstName: firstName || null,
    lastName: lastName || null,
  };
}

function storedName(value: unknown) {
  const normalized = normalizeProfessionalName(value);
  return normalized || null;
}

export function resolveProfessionalNameField({
  stored,
  input,
  metadata,
}: {
  stored: string | null | undefined;
  input?: string | null;
  metadata: string | null | undefined;
}) {
  const storedNormalized = storedName(stored);
  const metadataNormalized = storedName(metadata);

  if (input !== undefined) {
    const inputNormalized = storedName(input);

    if (inputNormalized) {
      return inputNormalized;
    }

    return storedNormalized;
  }

  if (storedNormalized) {
    return storedNormalized;
  }

  return metadataNormalized;
}

export function resolveProfessionalNames({
  storedFirstName,
  storedLastName,
  inputFirstName,
  inputLastName,
  metadataFirstName,
  metadataLastName,
}: {
  storedFirstName?: string | null;
  storedLastName?: string | null;
  inputFirstName?: string | null;
  inputLastName?: string | null;
  metadataFirstName?: string | null;
  metadataLastName?: string | null;
}): ResolvedProfessionalNames {
  return {
    firstName: resolveProfessionalNameField({
      stored: storedFirstName,
      input: inputFirstName,
      metadata: metadataFirstName,
    }),
    lastName: resolveProfessionalNameField({
      stored: storedLastName,
      input: inputLastName,
      metadata: metadataLastName,
    }),
  };
}

export function buildOwnProfessionalNameWritePayload({
  resolved,
  storedFirstName,
  storedLastName,
}: {
  resolved: ResolvedProfessionalNames;
  storedFirstName?: string | null;
  storedLastName?: string | null;
}) {
  const payload: { first_name?: string; last_name?: string } = {};
  const storedFirst = storedName(storedFirstName);
  const storedLast = storedName(storedLastName);

  if (resolved.firstName && resolved.firstName !== storedFirst) {
    payload.first_name = resolved.firstName;
  }

  if (resolved.lastName && resolved.lastName !== storedLast) {
    payload.last_name = resolved.lastName;
  }

  return payload;
}

export async function loadCurrentUserProfessionalNames(
  supabase: SupabaseClient,
): Promise<ResolvedProfessionalNames> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { firstName: null, lastName: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  const transit = readTransitNamesFromMetadata(user.user_metadata);

  return resolveProfessionalNames({
    storedFirstName: profile?.first_name,
    storedLastName: profile?.last_name,
    metadataFirstName: transit.firstName,
    metadataLastName: transit.lastName,
  });
}

export async function syncCurrentUserProfessionalNames(
  supabase: SupabaseClient,
  options: {
    firstName?: string | null;
    lastName?: string | null;
    requireNames?: boolean;
  } = {},
): Promise<
  | {
      ok: true;
      firstName: string | null;
      lastName: string | null;
      wrote: boolean;
      payload: { first_name?: string; last_name?: string };
    }
  | { ok: false; error: string }
> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: PROFESSIONAL_NAME_UNAUTHENTICATED_ERROR };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, error: PROFESSIONAL_NAME_SYNC_ERROR };
  }

  const transit = readTransitNamesFromMetadata(user.user_metadata);
  const resolved = resolveProfessionalNames({
    storedFirstName: profile?.first_name,
    storedLastName: profile?.last_name,
    inputFirstName: options.firstName,
    inputLastName: options.lastName,
    metadataFirstName: transit.firstName,
    metadataLastName: transit.lastName,
  });

  const firstNameError = validateProfessionalName(
    resolved.firstName ?? "",
    "First name",
    { required: Boolean(options.requireNames) },
  );
  const lastNameError = validateProfessionalName(
    resolved.lastName ?? "",
    "Last name",
    { required: Boolean(options.requireNames) },
  );

  if (firstNameError || lastNameError) {
    return { ok: false, error: firstNameError || lastNameError || PROFESSIONAL_NAME_SYNC_ERROR };
  }

  const payload = buildOwnProfessionalNameWritePayload({
    resolved,
    storedFirstName: profile?.first_name,
    storedLastName: profile?.last_name,
  });

  if (Object.keys(payload).length === 0) {
    return {
      ok: true,
      firstName: resolved.firstName,
      lastName: resolved.lastName,
      wrote: false,
      payload,
    };
  }

  if (profile?.id) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id);

    if (updateError) {
      return { ok: false, error: PROFESSIONAL_NAME_SYNC_ERROR };
    }
  } else {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      ...payload,
    });

    if (insertError) {
      return { ok: false, error: PROFESSIONAL_NAME_SYNC_ERROR };
    }
  }

  return {
    ok: true,
    firstName: resolved.firstName,
    lastName: resolved.lastName,
    wrote: true,
    payload,
  };
}
