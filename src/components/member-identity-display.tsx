import { formatMemberIdentity } from "@/lib/auth/professional-identity-display";

type MemberIdentityDisplayProps = {
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  email?: string | null;
  isCurrentUser?: boolean;
};

export function MemberIdentityDisplay({
  firstName,
  lastName,
  jobTitle,
  email,
  isCurrentUser = false,
}: MemberIdentityDisplayProps) {
  const identity = formatMemberIdentity({
    firstName,
    lastName,
    jobTitle,
    email,
  });

  return (
    <div className="min-w-0 max-w-full">
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
        <p
          className="min-w-0 max-w-full break-words [overflow-wrap:anywhere] font-black text-white"
          title={identity.primary}
        >
          {identity.primary}
        </p>

        {isCurrentUser ? (
          <span className="rounded-full border border-[#C8A646]/25 bg-[#C8A646]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#F5D77B]">
            You
          </span>
        ) : null}
      </div>

      {identity.jobTitle ? (
        <p
          className="mt-1 max-w-full break-words [overflow-wrap:anywhere] text-sm font-semibold text-slate-300"
          title={identity.jobTitle}
        >
          {identity.jobTitle}
        </p>
      ) : null}

      {identity.email && !identity.emailIsPrimary ? (
        <p
          className="mt-1 max-w-full break-words [overflow-wrap:anywhere] text-xs font-semibold text-slate-400"
          title={identity.email}
        >
          {identity.email}
        </p>
      ) : null}
    </div>
  );
}