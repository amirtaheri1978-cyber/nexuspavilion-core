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
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="break-words font-black text-white">{identity.primary}</p>
        {isCurrentUser ? (
          <span className="rounded-full border border-[#C8A646]/25 bg-[#C8A646]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#F5D77B]">
            You
          </span>
        ) : null}
      </div>

      {identity.jobTitle ? (
        <p className="mt-1 break-words text-sm font-semibold text-slate-300">
          {identity.jobTitle}
        </p>
      ) : null}

      {identity.email && !identity.emailIsPrimary ? (
        <p className="mt-1 break-words text-xs font-semibold text-slate-500">
          {identity.email}
        </p>
      ) : null}
    </div>
  );
}
