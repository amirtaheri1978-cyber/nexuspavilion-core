import {
  formatMemberIdentity,
  getAccountIdentitySecondary,
  type MemberIdentityInput,
} from "@/lib/auth/professional-identity-display";

type AccountIdentityLineProps = MemberIdentityInput & {
  roleLabel?: string | null;
};

export function AccountIdentityLine({
  firstName,
  lastName,
  jobTitle,
  email,
  roleLabel,
}: AccountIdentityLineProps) {
  const identity = formatMemberIdentity({
    firstName,
    lastName,
    jobTitle,
    email,
  });
  const secondary = getAccountIdentitySecondary(identity);
  const accessiblePrimary = [identity.primary, roleLabel, secondary]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mt-2 min-w-0">
      <p
        className="np-type-body min-w-0 break-words text-pretty text-nexus-text-secondary"
        title={accessiblePrimary}
      >
        Signed in as {identity.primary}
        {roleLabel ? (
          <span className="text-nexus-muted"> · {roleLabel}</span>
        ) : null}
      </p>
      {secondary ? (
        <p
          className="np-type-meta mt-1 min-w-0 break-words text-pretty text-nexus-muted"
          title={secondary}
        >
          {secondary}
        </p>
      ) : null}
    </div>
  );
}
