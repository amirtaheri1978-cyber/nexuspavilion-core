import { AccountIdentityLine } from "@/components/account-identity-line";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { MemberIdentityDisplay } from "@/components/member-identity-display";
import {
  formatMemberRemovalSubject,
  formatOwnershipTransferOptionLabel,
} from "@/lib/auth/professional-identity-display";
import { EXECUTIVE_PAGE_CLASS } from "@/lib/design-system/executive-contract";

const LONG_NAME =
  "Alexandria-Catherine Montgomery-Whitfield";
const LONG_TITLE =
  "Vice President of Strategic Global Procurement Operations";

export function IdentitySurfacesVisualQaFixture() {
  return (
    <div className="min-h-screen bg-[#07111F] text-white">
      <div className={EXECUTIVE_PAGE_CLASS}>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#C8A646]">
          Visual QA · identity surfaces
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white">
          Professional Identity Surfaces
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
          Production-guarded fixtures for account, governance, member,
          sidebar company, RFQ company, and notification email-only copy.
          No Dev mutation.
        </p>

        <ExecutivePanel
          variant="operational"
          padding="lg"
          className="mt-8"
        >
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
            Sidebar / topbar
          </p>
          <h2 className="mt-3 text-2xl font-black text-white">
            Company identity remains company-level
          </h2>
          <div className="mt-5 max-w-sm rounded-[18px] border border-white/10 bg-[#07111F]/75 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
              Workspace
            </p>
            <p className="mt-1 truncate text-xs font-black text-white">
              Harbor Steel Co.
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Executive Workspace
            </p>
          </div>
        </ExecutivePanel>

        <ExecutivePanel
          variant="operational"
          padding="lg"
          className="mt-8"
        >
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
            Account identity
          </p>
          <h2 className="mt-3 text-2xl font-black text-white">
            Signed-in current user
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Name + title
              </p>
              <AccountIdentityLine
                firstName="Alex"
                lastName="Morgan"
                jobTitle="Procurement Director"
                email="alex.morgan@example.com"
                roleLabel="Owner"
              />
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Name, title null
              </p>
              <AccountIdentityLine
                firstName="Jordan"
                lastName="Lee"
                jobTitle={null}
                email="jordan.lee@example.com"
                roleLabel="Admin"
              />
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Names null, email present
              </p>
              <AccountIdentityLine
                firstName={null}
                lastName={null}
                jobTitle={null}
                email="legacy.user@example.com"
                roleLabel="Member"
              />
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Long name and title
              </p>
              <AccountIdentityLine
                firstName={LONG_NAME}
                lastName="Quintanilla"
                jobTitle={LONG_TITLE}
                email="long.name@example.com"
                roleLabel="Viewer"
              />
            </article>
          </div>
        </ExecutivePanel>

        <ExecutivePanel
          variant="operational"
          padding="lg"
          className="mt-8"
        >
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
            Governance / members
          </p>
          <h2 className="mt-3 text-2xl font-black text-white">
            Current user vs other member
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <MemberIdentityDisplay
                firstName="Alex"
                lastName="Morgan"
                jobTitle="Procurement Director"
                email="alex.morgan@example.com"
                isCurrentUser
              />
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <MemberIdentityDisplay
                firstName="Sam"
                lastName="Patel"
                jobTitle="Category Manager"
                email="sam.patel@example.com"
              />
            </article>
          </div>
          <p className="mt-5 break-words text-sm font-semibold text-slate-300">
            Current owner: Alex Morgan
          </p>
          <p className="mt-1 break-words text-xs font-semibold text-slate-400">
            alex.morgan@example.com
          </p>
          <p className="mt-4 break-words text-sm font-semibold text-slate-300">
            Transfer target:{" "}
            {formatOwnershipTransferOptionLabel({
              firstName: "Jordan",
              lastName: "Lee",
              jobTitle: null,
              email: "jordan.lee@example.com",
              workspaceRole: "admin",
            })}
          </p>
          <p className="mt-4 break-words text-sm font-semibold text-slate-300">
            Remove confirm:{" "}
            {formatMemberRemovalSubject(
              "Alex Morgan",
              "alex.morgan@example.com",
            )}
          </p>
        </ExecutivePanel>

        <ExecutivePanel
          variant="operational"
          padding="lg"
          className="mt-8"
        >
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
            RFQ / quote
          </p>
          <h2 className="mt-3 text-2xl font-black text-white">
            Company identity stays company name
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="np-type-h3">Harbor Steel Co.</p>
              <p className="mt-2 text-xs font-semibold text-slate-400">
                Supplier quote
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="np-type-h3">Atlas Trade Group</p>
              <p className="mt-2 text-xs font-semibold text-slate-400">
                Supplier quote
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="np-type-h3">Northline Equipment</p>
              <p className="mt-2 text-xs font-semibold text-slate-400">
                Supplier quote
              </p>
            </article>
          </div>
        </ExecutivePanel>

        <ExecutivePanel
          variant="operational"
          padding="lg"
          className="mt-8"
        >
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
            Notifications / invitations
          </p>
          <h2 className="mt-3 text-2xl font-black text-white">
            Email-only by design
          </h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
            Invitation stored as written: jordan.lee@example.com was invited as
            admin.
          </p>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-300">
            Pending invitee has no profile yet: jordan.lee@example.com
          </p>
        </ExecutivePanel>
      </div>
    </div>
  );
}
