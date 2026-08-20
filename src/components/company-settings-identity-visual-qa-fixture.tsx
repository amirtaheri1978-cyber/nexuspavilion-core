"use client";

import { MemberIdentityDisplay } from "@/components/member-identity-display";
import { ProfessionalIdentitySettingsForm } from "@/components/professional-identity-settings-form";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { EXECUTIVE_PAGE_CLASS } from "@/lib/design-system/executive-contract";
import {
  FRIENDLY_IDENTITY_AMBIGUOUS_WORKSPACE,
  FRIENDLY_IDENTITY_NO_ACTIVE_MEMBERSHIP,
} from "@/lib/auth/professional-identity-settings";

export function CompanySettingsIdentityVisualQaFixture() {
  return (
    <div className="min-h-screen bg-[#07111F] text-white">
      <div className={EXECUTIVE_PAGE_CLASS}>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#C8A646]">
          Visual QA · company settings identity
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white">
          Company Command & Governance
        </h1>

        <ExecutivePanel
          variant="operational"
          padding="lg"
          tone="gold"
          className="mt-8"
        >
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
            Account Identity
          </p>
          <h2 className="mt-3 text-3xl font-black text-white">
            Professional Identity
          </h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-400">
            Your title in this workspace
          </p>
          <ProfessionalIdentitySettingsForm
            initialFirstName="Alex"
            initialLastName="Morgan"
            initialJobTitle="Procurement Director"
            email="alex.morgan@example.com"
            preview
          />
        </ExecutivePanel>

        <ExecutivePanel
          variant="operational"
          padding="lg"
          className="mt-8"
        >
          <h2 className="text-2xl font-black text-white">Error states</h2>
          <p className="mt-3 text-sm font-semibold text-rose-200" role="alert">
            {FRIENDLY_IDENTITY_AMBIGUOUS_WORKSPACE}
          </p>
          <p className="mt-3 text-sm font-semibold text-rose-200" role="alert">
            {FRIENDLY_IDENTITY_NO_ACTIVE_MEMBERSHIP}
          </p>
          <ProfessionalIdentitySettingsForm
            initialFirstName=""
            initialLastName=""
            initialJobTitle=""
            email="legacy.user@example.com"
            preview
            previewError="First name is required."
          />
        </ExecutivePanel>

        <ExecutivePanel
          variant="operational"
          padding="lg"
          className="mt-8"
        >
          <h2 className="text-2xl font-black text-white">Company Members</h2>
          <div className="mt-6 grid gap-4">
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
                firstName="Jordan"
                lastName="Lee"
                jobTitle={null}
                email="jordan.lee@example.com"
              />
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <MemberIdentityDisplay
                firstName={null}
                lastName={null}
                jobTitle={null}
                email="legacy.user@example.com"
              />
            </article>
          </div>
        </ExecutivePanel>
      </div>
    </div>
  );
}
