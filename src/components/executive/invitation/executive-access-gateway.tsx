import Image from "next/image";
import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";

import {
  ExecutiveAccessJourney,
  type ExecutiveAccessState,
} from "./executive-access-journey";
import { ExecutiveAccessStatePanel } from "./executive-access-state";

type ExecutiveAccessGatewayProps = {
  state: ExecutiveAccessState;
  companyName: string;
  companyCategory: string;
  companyLocation: string;
  companyLogoUrl: string | null;
  invitationEmail: string;
  authenticatedEmail: string;
  roleLabel: string;
  statusLabel: string;
  statusTone: "neutral" | "warning" | "success";
  signupHref: string;
  invitationToken: string;
};

type BriefItemProps = {
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "success";
};

export function ExecutiveAccessGateway({
  state,
  companyName,
  companyCategory,
  companyLocation,
  companyLogoUrl,
  invitationEmail,
  authenticatedEmail,
  roleLabel,
  statusLabel,
  statusTone,
  signupHref,
  invitationToken,
}: ExecutiveAccessGatewayProps) {
  return (
    <ExecutiveAccessPageShell>
      <div className="mx-auto w-full max-w-[1240px]">
        <Link
          href="/login"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-semibold text-nexus-text-secondary transition duration-200 hover:border-white/20 hover:bg-white/[0.07] hover:text-nexus-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC4E8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
        >
          <span aria-hidden="true">←</span>
          Return to secure sign in
        </Link>

        <ExecutivePanel
          variant="executive"
          padding="none"
          tone="blue"
          className="mt-4"
        >
          <header className="relative border-b border-white/10 px-5 py-6 sm:px-7 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-6">
              <div className="max-w-4xl">
                <div className="flex flex-wrap items-center gap-3">
                  <ExecutiveBadge tone="blue" size="md">
                    Nexus Pavilion
                  </ExecutiveBadge>
                  <ExecutiveBadge tone="board" size="md">
                    Executive Access Gateway
                  </ExecutiveBadge>
                </div>

                <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.24em] text-nexus-text-muted">
                  Secure access to
                </p>

                <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-[-0.045em] text-nexus-white sm:text-4xl lg:text-5xl lg:leading-[1.03]">
                  {companyName}
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-6 text-nexus-text-secondary sm:text-[15px]">
                  {roleLabel} access has been assigned to the authorized
                  recipient. Identity verification is required before workspace
                  provisioning can be completed.
                </p>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-5">
                <VerificationSignal label="Invitation verified" tone="success" />
                <VerificationSignal label="Recipient protected" tone="blue" />
                <VerificationSignal label="Audit trail enabled" tone="gold" />
              </div>
            </div>
          </header>

          <div className="relative grid gap-5 px-5 py-5 sm:px-7 lg:px-8 lg:py-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.5fr)]">
            <div className="space-y-5">
              <ExecutivePanel
                variant="operational"
                padding="md"
                aria-labelledby="executive-access-brief-heading"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    {companyLogoUrl ? (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white p-2 shadow-lg shadow-black/20">
                        <Image
                          src={companyLogoUrl}
                          alt={`${companyName} logo`}
                          width={64}
                          height={64}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-2xl font-black text-cyan-200">
                        {companyName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-nexus-gold">
                        Executive Access Brief
                      </p>

                      <h2
                        id="executive-access-brief-heading"
                        className="mt-2 text-xl font-black tracking-[-0.025em] text-nexus-white"
                      >
                        Authorization summary
                      </h2>

                      <p className="mt-2 text-sm font-medium leading-5 text-nexus-text-secondary">
                        {companyCategory}
                        <span aria-hidden="true" className="mx-2 text-white/20">
                          •
                        </span>
                        {companyLocation}
                      </p>
                    </div>
                  </div>

                  <ExecutiveBadge
                    tone={
                      statusTone === "success"
                        ? "success"
                        : statusTone === "warning"
                          ? "warning"
                          : "neutral"
                    }
                    size="md"
                  >
                    {statusLabel}
                  </ExecutiveBadge>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <BriefItem label="Organization" value={companyName} />
                  <BriefItem label="Access Level" value={roleLabel} />
                  <BriefItem
                    label="Authorized Recipient"
                    value={invitationEmail}
                  />
                  <BriefItem
                    label="Current Status"
                    value={statusLabel}
                    tone={statusTone}
                  />
                </div>
              </ExecutivePanel>

              <ExecutiveAccessJourney state={state} />
            </div>

            <aside aria-label="Workspace access control">
              <ExecutiveAccessStatePanel
                state={state}
                invitationEmail={invitationEmail}
                authenticatedEmail={authenticatedEmail}
                signupHref={signupHref}
                invitationToken={invitationToken}
                roleLabel={roleLabel}
              />
            </aside>
          </div>

          <footer className="border-t border-white/10 bg-black/10 px-5 py-4 sm:px-7 lg:px-8">
            <div className="flex flex-col gap-2 text-[11px] leading-5 text-nexus-text-muted sm:flex-row sm:items-center sm:justify-between">
              <p>
                Access is restricted to the authorized recipient and assigned
                workspace role.
              </p>
              <p className="font-semibold text-nexus-text-secondary">
                Nexus Pavilion Secure Access Protocol
              </p>
            </div>
          </footer>
        </ExecutivePanel>
      </div>
    </ExecutiveAccessPageShell>
  );
}

export function ExecutiveAccessPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07111F] px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(44,196,232,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(200,166,70,0.08),transparent_30%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:48px_48px]"
      />
      <div className="relative">{children}</div>
    </main>
  );
}

function BriefItem({
  label,
  value,
  tone = "neutral",
}: BriefItemProps) {
  const valueClassName =
    tone === "warning"
      ? "text-amber-200"
      : tone === "success"
        ? "text-emerald-300"
        : "text-nexus-white";

  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/10 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-nexus-text-muted">
        {label}
      </p>
      <p
        className={`mt-2 break-words text-sm font-bold leading-5 ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

function VerificationSignal({
  label,
  tone,
}: {
  label: string;
  tone: "blue" | "gold" | "success";
}) {
  const dotClassName =
    tone === "success"
      ? "bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.65)]"
      : tone === "gold"
        ? "bg-[#C8A646] shadow-[0_0_14px_rgba(200,166,70,0.55)]"
        : "bg-[#2CC4E8] shadow-[0_0_14px_rgba(44,196,232,0.55)]";

  return (
    <div className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 rounded-full ${dotClassName}`}
      />
      <span className="text-xs font-bold text-nexus-text-secondary">
        {label}
      </span>
    </div>
  );
}
