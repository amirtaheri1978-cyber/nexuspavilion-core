import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";

import type { ExecutiveAccessState } from "./executive-access-journey";

type ExecutiveAccessStatePanelProps = {
  state: ExecutiveAccessState;
  invitationEmail: string;
  authenticatedEmail: string;
  signupHref: string;
  invitationToken: string;
  roleLabel: string;
};

type ExecutiveAccessStateCardProps = {
  eyebrow: string;
  title: string;
  message: string;
  actionHref: string;
  actionLabel: string;
  tone?: "neutral" | "warning" | "success";
};

const primaryActionClass =
  "inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 py-3.5 text-center text-sm font-black transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]";

const secondaryActionClass =
  "inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-center text-sm font-bold text-nexus-white transition duration-200 hover:border-white/25 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC4E8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]";

export function ExecutiveAccessStatePanel({
  state,
  invitationEmail,
  authenticatedEmail,
  signupHref,
  invitationToken,
  roleLabel,
}: ExecutiveAccessStatePanelProps) {
  if (state === "unauthenticated") {
    return (
      <StatePanel tone="blue">
        <StateIcon tone="blue">ID</StateIcon>
        <StateHeader
          badge="Identity Verification"
          badgeTone="blue"
          title="Verify the authorized recipient"
          description="Continue with the approved recipient identity. Workspace permissions cannot be provisioned to a different email address."
        />

        <RecordCard
          label="Authorized Recipient"
          value={invitationEmail}
          valueClassName="text-nexus-white"
        />

        <div className="mt-5 grid gap-3">
          <Link
            href={signupHref}
            className={`${primaryActionClass} bg-[#2CC4E8] text-[#06111F] shadow-[0_12px_32px_rgba(44,196,232,0.16)] hover:bg-[#59D2EC] focus-visible:ring-[#2CC4E8]`}
          >
            Create Authorized Account
          </Link>

          <Link href="/login" className={secondaryActionClass}>
            Sign In With Existing Account
          </Link>
        </div>

        <SecurityAssurance>
          Recipient matching protects company governance, access accountability,
          and procurement data.
        </SecurityAssurance>
      </StatePanel>
    );
  }

  if (state === "identity_mismatch") {
    return (
      <StatePanel tone="gold">
        <StateIcon tone="warning">!</StateIcon>
        <StateHeader
          badge="Identity Protection"
          badgeTone="warning"
          title="Use the authorized identity"
          description="The current session does not match the approved recipient. Access assignment remains blocked until the authorized identity is used."
        />

        <dl className="mt-5 grid gap-3">
          <RecordCard
            label="Authorized Recipient"
            value={invitationEmail}
            valueClassName="text-emerald-300"
          />
          <RecordCard
            label="Current Session"
            value={authenticatedEmail}
            valueClassName="text-amber-200"
          />
        </dl>

        <Link
          href="/login"
          className={`${primaryActionClass} mt-5 bg-amber-300 text-[#151006] shadow-[0_12px_32px_rgba(252,211,77,0.12)] hover:bg-amber-200 focus-visible:ring-amber-300`}
        >
          Sign In With Authorized Identity
        </Link>

        <SecurityAssurance>
          This control prevents unauthorized workspace attachment and protects
          role-based procurement access.
        </SecurityAssurance>
      </StatePanel>
    );
  }

  if (state === "expired") {
    return (
      <ExecutiveAccessStateCard
        eyebrow="Authorization Expired"
        title="A new invitation is required"
        message="This authorization is no longer active. Contact the workspace administrator and request a new secure invitation."
        actionHref="/dashboard"
        actionLabel="Return to Executive Workspace"
        tone="warning"
      />
    );
  }

  if (state === "accepted") {
    return (
      <ExecutiveAccessStateCard
        eyebrow="Access Governance"
        title="Workspace access is active"
        message="This invitation has already been accepted and the associated workspace permissions have been provisioned."
        actionHref="/dashboard"
        actionLabel="Open Executive Workspace"
        tone="success"
      />
    );
  }

  if (state === "unavailable") {
    return (
      <ExecutiveAccessStateCard
        eyebrow="Access Governance"
        title="Invitation is no longer available"
        message="This workspace authorization cannot be completed in its current state. Contact the workspace administrator for assistance."
        actionHref="/dashboard"
        actionLabel="Return to Executive Workspace"
      />
    );
  }

  return (
    <StatePanel tone="success">
      <StateIcon tone="success">✓</StateIcon>
      <StateHeader
        badge="Identity Confirmed"
        badgeTone="success"
        title="Activate workspace access"
        description="Your identity matches the authorized recipient. Confirm acceptance to activate the assigned procurement permissions."
      />

      <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
          Access Provisioning
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-nexus-text-secondary">
          {roleLabel} permissions will be assigned within the company workspace.
        </p>
      </div>

      <form
        action="/api/company-invitations/accept"
        method="POST"
        className="mt-5"
      >
        <input type="hidden" name="token" value={invitationToken} />
        <button
          type="submit"
          className={`${primaryActionClass} bg-emerald-400 text-[#06130D] shadow-[0_12px_32px_rgba(52,211,153,0.14)] hover:bg-emerald-300 focus-visible:ring-emerald-300`}
        >
          Verify Identity and Activate Access
        </button>
      </form>

      <SecurityAssurance>
        Acceptance records the authorized account, assigned role, and activation
        event for workspace governance.
      </SecurityAssurance>
    </StatePanel>
  );
}

export function ExecutiveAccessStateCard({
  eyebrow,
  title,
  message,
  actionHref,
  actionLabel,
  tone = "neutral",
}: ExecutiveAccessStateCardProps) {
  const presentation =
    tone === "warning"
      ? {
          panelTone: "gold" as const,
          icon: "!",
          iconTone: "warning" as const,
          badgeTone: "warning" as const,
          action:
            "bg-amber-300 text-[#151006] hover:bg-amber-200 focus-visible:ring-amber-300",
        }
      : tone === "success"
        ? {
            panelTone: "success" as const,
            icon: "✓",
            iconTone: "success" as const,
            badgeTone: "success" as const,
            action:
              "bg-emerald-400 text-[#06130D] hover:bg-emerald-300 focus-visible:ring-emerald-300",
          }
        : {
            panelTone: "blue" as const,
            icon: "i",
            iconTone: "blue" as const,
            badgeTone: "blue" as const,
            action:
              "bg-[#2CC4E8] text-[#06111F] hover:bg-[#59D2EC] focus-visible:ring-[#2CC4E8]",
          };

  return (
    <ExecutivePanel
      variant="boardroom"
      padding="lg"
      tone={presentation.panelTone}
      className="mx-auto w-full max-w-xl"
    >
      <StateIcon tone={presentation.iconTone}>{presentation.icon}</StateIcon>
      <StateHeader
        badge={eyebrow}
        badgeTone={presentation.badgeTone}
        title={title}
        description={message}
      />
      <Link
        href={actionHref}
        className={`${primaryActionClass} mt-6 ${presentation.action}`}
      >
        {actionLabel}
      </Link>
    </ExecutivePanel>
  );
}

function StatePanel({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "blue" | "gold" | "success";
}) {
  return (
    <ExecutivePanel
      variant="boardroom"
      padding="md"
      tone={tone}
      className="h-full"
    >
      {children}
    </ExecutivePanel>
  );
}

function StateHeader({
  badge,
  badgeTone,
  title,
  description,
}: {
  badge: string;
  badgeTone: "blue" | "gold" | "warning" | "success";
  title: string;
  description: string;
}) {
  return (
    <>
      <ExecutiveBadge tone={badgeTone} className="mt-5">
        {badge}
      </ExecutiveBadge>

      <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-nexus-white">
        {title}
      </h2>

      <p className="mt-3 text-sm leading-6 text-nexus-text-secondary">
        {description}
      </p>
    </>
  );
}

function StateIcon({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "blue" | "warning" | "success";
}) {
  const className =
    tone === "warning"
      ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
      : tone === "success"
        ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
        : "border-cyan-400/25 bg-cyan-400/10 text-cyan-200";

  return (
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-base font-black ${className}`}
    >
      {children}
    </div>
  );
}

function RecordCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-nexus-text-muted">
        {label}
      </dt>
      <dd
        className={`mt-2 break-words text-sm font-bold leading-5 ${valueClassName}`}
      >
        {value}
      </dd>
    </div>
  );
}

function SecurityAssurance({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-nexus-text-muted">
        Security Assurance
      </p>
      <p className="mt-2 text-xs leading-5 text-nexus-text-muted">{children}</p>
    </div>
  );
}
