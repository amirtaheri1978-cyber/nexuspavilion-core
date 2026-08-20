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
        className="break-words text-sm font-semibold text-slate-300"
        title={accessiblePrimary}
      >
        Signed in as {identity.primary}
        {roleLabel ? ` · ${roleLabel}` : ""}
      </p>
      {secondary ? (
        <p
          className="mt-1 break-words text-xs font-semibold text-slate-400"
          title={secondary}
        >
          {secondary}
        </p>
      ) : null}
    </div>
  );
}
