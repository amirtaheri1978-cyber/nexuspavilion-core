import {
  normalizeJobTitle,
  normalizeProfessionalName,
} from "@/lib/auth/professional-names";

export type MemberIdentityInput = {
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  email?: string | null;
};

export type FormattedMemberIdentity = {
  primary: string;
  fullName: string | null;
  jobTitle: string | null;
  email: string | null;
  emailIsPrimary: boolean;
};

export function formatMemberIdentity({
  firstName,
  lastName,
  jobTitle,
  email,
}: MemberIdentityInput): FormattedMemberIdentity {
  const first = normalizeProfessionalName(firstName);
  const last = normalizeProfessionalName(lastName);
  const title = normalizeJobTitle(jobTitle);
  const mail = String(email ?? "").trim();
  const fullName = [first, last].filter(Boolean).join(" ");

  if (fullName) {
    return {
      primary: fullName,
      fullName,
      jobTitle: title || null,
      email: mail || null,
      emailIsPrimary: false,
    };
  }

  return {
    primary: mail || "No email",
    fullName: null,
    jobTitle: title || null,
    email: mail || null,
    emailIsPrimary: true,
  };
}

export function readOrganizationMemberIdentity(row: {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  job_title?: string | null;
}) {
  return formatMemberIdentity({
    firstName: row.first_name,
    lastName: row.last_name,
    jobTitle: row.job_title,
    email: row.email,
  });
}

export function getAccountIdentitySecondary(
  identity: FormattedMemberIdentity,
): string | null {
  if (identity.jobTitle) {
    return identity.jobTitle;
  }

  if (!identity.emailIsPrimary && identity.email) {
    return identity.email;
  }

  return null;
}

export function formatOwnershipTransferOptionLabel(input: {
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  email?: string | null;
  workspaceRole: string;
}): string {
  const identity = formatMemberIdentity(input);
  const hasRenderablePrimary = Boolean(identity.fullName || identity.email);
  const primary = hasRenderablePrimary ? identity.primary : "Member";

  return `${primary} — ${input.workspaceRole}`;
}

export function formatMemberRemovalSubject(
  memberLabel: string | null | undefined,
  memberEmail: string | null | undefined,
): string {
  const label = String(memberLabel ?? "").trim();
  const email = String(memberEmail ?? "").trim();

  if (label && email && label !== email) {
    return `${label} (${email})`;
  }

  return label || email || "this member";
}
