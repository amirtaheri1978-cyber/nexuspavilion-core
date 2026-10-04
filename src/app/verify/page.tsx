"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CTA_SECONDARY,
  EXECUTIVE_FOCUS_GOLD,
} from "@/lib/design-system/executive-contract";

type VerificationStatus =
  | "success"
  | "expired"
  | "already"
  | "error"
  | "pending";

const STATUS_CONTENT: Record<
  VerificationStatus,
  {
    eyebrow: string;
    title: string;
    description: string;
    icon: string;
    tone: "success" | "warning" | "neutral";
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  }
> = {
  success: {
    eyebrow: "Email verified",
    title: "Your enterprise identity is verified.",
    description:
      "Your email has been confirmed successfully. You can now continue setting up your Intelligent Procurement company workspace.",
    icon: "✓",
    tone: "success",
    primaryLabel: "Continue to company setup",
    primaryHref: "/create-company",
    secondaryLabel: "Go to dashboard",
    secondaryHref: "/dashboard",
  },
  expired: {
    eyebrow: "Verification link expired",
    title: "This secure link is no longer valid.",
    description:
      "For your protection, verification links expire after a limited time. Please request a new verification email or sign in again.",
    icon: "!",
    tone: "warning",
    primaryLabel: "Back to sign in",
    primaryHref: "/login",
    secondaryLabel: "Create account",
    secondaryHref: "/signup",
  },
  already: {
    eyebrow: "Already verified",
    title: "Your email is already confirmed.",
    description:
      "This account has already completed email verification. Continue to your secure workspace.",
    icon: "✓",
    tone: "success",
    primaryLabel: "Continue to dashboard",
    primaryHref: "/dashboard",
    secondaryLabel: "Back to sign in",
    secondaryHref: "/login",
  },
  error: {
    eyebrow: "Verification unavailable",
    title: "We could not verify this link.",
    description:
      "The verification request could not be completed securely. Please sign in again or request a new verification email.",
    icon: "!",
    tone: "warning",
    primaryLabel: "Back to sign in",
    primaryHref: "/login",
    secondaryLabel: "Create account",
    secondaryHref: "/signup",
  },
  pending: {
    eyebrow: "Verify your email",
    title: "Check your inbox to verify your account.",
    description:
      "We sent a secure verification link to your email address. Confirm your email before continuing to your enterprise workspace.",
    icon: "→",
    tone: "neutral",
    primaryLabel: "Back to sign in",
    primaryHref: "/login",
    secondaryLabel: "Create account",
    secondaryHref: "/signup",
  },
};

const VERIFICATION_SIGNALS = [
  "Secure identity confirmation",
  "Protected workspace activation",
  "Company access readiness",
  "Enterprise account governance",
];

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyShell status="pending" />}>
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const searchParams = useSearchParams();

  const status = useMemo<VerificationStatus>(() => {
    const rawStatus = searchParams.get("status");

    if (rawStatus === "success") return "success";
    if (rawStatus === "expired") return "expired";
    if (rawStatus === "already") return "already";
    if (rawStatus === "error") return "error";

    return "pending";
  }, [searchParams]);

  return <VerifyShell status={status} />;
}

function VerifyShell({ status }: { status: VerificationStatus }) {
  const content = STATUS_CONTENT[status];
  const isAlert = status === "expired" || status === "error";

  const iconToneClass =
    content.tone === "success"
      ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-300"
      : content.tone === "warning"
        ? "border-amber-300/30 bg-amber-400/10 text-amber-200"
        : "border-[#C8A646]/25 bg-[#C8A646]/10 text-[#F5D77B]";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_34%,rgba(200,166,70,0.05)_68%,transparent)]" />

      <section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[1680px] items-stretch gap-8 lg:grid-cols-[0.82fr_1.18fr] xl:gap-10">
        <aside className="flex h-full min-h-0 flex-col rounded-[32px] border border-white/10 bg-white/[0.04] p-7 sm:p-9 lg:p-11 xl:p-12">
          <BrandMark />

          <div className="mt-10">
            <h1 className="max-w-2xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[58px] xl:leading-[1.02]">
              Confirm your secure enterprise identity.
            </h1>

            <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-slate-300">
              Email verification protects company workspaces, procurement
              data, RFQ access, supplier collaboration, and executive
              reporting within Intelligent Procurement.
            </p>
          </div>

          <ul className="mt-9 space-y-2.5">
            {VERIFICATION_SIGNALS.map((signal) => (
              <li
                key={signal}
                className="flex items-start gap-3 text-sm font-semibold text-slate-200"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#C8A646]/35 bg-[#C8A646]/10 text-[10px] text-[#F5D77B]"
                >
                  ✓
                </span>
                <span>{signal}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto border-t border-white/10 pt-7">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
              Protected access flow
            </p>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
              Verification ensures that only confirmed users can activate
              or access company-level procurement workspaces.
            </p>
          </div>
        </aside>

        <section className="flex h-full min-h-0 w-full flex-col rounded-[32px] border border-white/10 bg-white/[0.055] p-7 sm:p-10 lg:p-12 xl:p-14">
          <div
            role={isAlert ? "alert" : "status"}
            aria-live={isAlert ? "assertive" : "polite"}
            className="flex flex-1 flex-col"
          >
            <div
              aria-hidden="true"
              className={`flex h-12 w-12 items-center justify-center rounded-full border text-lg font-black ${iconToneClass}`}
            >
              {content.icon}
            </div>

            <p className="mt-8 text-xs font-black uppercase tracking-[0.3em] text-[#F2D778]">
              {content.eyebrow}
            </p>

            <h2 className="mt-5 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[56px] xl:leading-[1.02]">
              {content.title}
            </h2>

            <p className="mt-5 text-base font-semibold leading-8 text-slate-300">
              {content.description}
            </p>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              <Link
                href={content.primaryHref}
                className={`${EXECUTIVE_CTA_PRIMARY} h-[56px]`}
              >
                {content.primaryLabel}
              </Link>

              <Link
                href={content.secondaryHref}
                className={`${EXECUTIVE_CTA_SECONDARY} h-[56px]`}
              >
                {content.secondaryLabel}
              </Link>
            </div>

            <div className="mt-8 border-y border-white/10 py-6">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                Need help?
              </p>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
                If you did not receive an email or the link no longer works,
                sign in again or create a new account request using your
                work email.
              </p>
            </div>
          </div>

          <p className="mt-auto pt-6 text-center text-xs font-semibold leading-5 text-slate-400">
            Secure email verification for Intelligent Procurement.
            <span className="mt-1 block font-bold text-slate-300">
              A Nexus Pavilion Inc. product
            </span>
          </p>
        </section>
      </section>
    </main>
  );
}

function BrandMark() {
  return (
    <Link
      href="/"
      aria-label="Intelligent Procurement home"
      className={`inline-flex w-fit flex-col gap-2 rounded-xl outline-none transition ${EXECUTIVE_FOCUS_GOLD}`}
    >
      <NexusPavilionLogo
        variant="horizontal"
        size={72}
        priority
        className="justify-start"
      />
      <div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#F2D778]">
          Intelligent Procurement
        </p>
        <p className="mt-1 text-[11px] font-semibold text-slate-400">
          A Nexus Pavilion Inc. product
        </p>
      </div>
    </Link>
  );
}
