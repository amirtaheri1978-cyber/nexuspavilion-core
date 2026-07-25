"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type CompanySummary = {
  name: string;
  category: string;
  location: string;
  logoUrl: string | null;
};

type ExecutiveEnrollmentGatewayProps = {
  token: string;
  company: CompanySummary;
  email: string;
  role: string;
  status: string;
  children: ReactNode;
};

const timeline = [
  {
    label: "Invitation verified",
    description: "Workspace authority confirmed",
    state: "complete",
  },
  {
    label: "Identity confirmed",
    description: "Authorized recipient matched",
    state: "complete",
  },
  {
    label: "Credential creation",
    description: "Secure account enrollment",
    state: "active",
  },
  {
    label: "Workspace provisioning",
    description: "Role and access activation",
    state: "pending",
  },
] as const;

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-3.5 w-3.5 fill-none stroke-current stroke-[2.4]"
    >
      <path
        d="m4 10 3.4 3.4L16 5.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-none stroke-current stroke-[1.8]"
    >
      <path
        d="M12 3 5 6v5c0 4.7 2.9 8.2 7 10 4.1-1.8 7-5.3 7-10V6l-7-3Z"
        strokeLinejoin="round"
      />
      <path
        d="m9.2 12 1.8 1.8 3.8-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-none stroke-current stroke-[1.7]"
    >
      <path d="M4 21V6l8-3v18M20 21V10l-8-2" strokeLinejoin="round" />
      <path
        d="M7 9h2M7 13h2M7 17h2M15 13h2M15 17h2M3 21h18"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ExecutiveEnrollmentGateway({
  token,
  company,
  email,
  role,
  status,
  children,
}: ExecutiveEnrollmentGatewayProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050d18] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(36,99,235,0.28),transparent_31%),radial-gradient(circle_at_84%_14%,rgba(196,154,77,0.18),transparent_28%),linear-gradient(180deg,#071423_0%,#06111f_50%,#050d18_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.85)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.85)_1px,transparent_1px)] [background-size:46px_46px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[7%] top-32 h-72 w-72 rounded-full bg-blue-500/10 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[7%] top-28 h-72 w-72 rounded-full bg-amber-300/10 blur-[130px]"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <Link
            href={`/invite/${token}`}
            className="group inline-flex items-center gap-3 text-sm font-semibold text-slate-300 transition hover:text-white"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] transition group-hover:border-[#c9a35d]/50 group-hover:bg-[#c9a35d]/10">
              ←
            </span>
            <span className="hidden sm:inline">Return to access brief</span>
            <span className="sm:hidden">Back</span>
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">
            <ShieldIcon />
            Verified invitation
          </div>
        </header>

        <section className="grid flex-1 gap-8 py-9 lg:grid-cols-[minmax(0,1.02fr)_minmax(430px,0.98fr)] lg:items-start lg:gap-9 lg:py-11">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c9a35d]/25 bg-[#c9a35d]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#e4c98f]">
              Nexus Pavilion · Executive Enrollment
            </div>

            <div className="mt-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Authorized organization
              </p>
              <p className="mt-2 text-xl font-semibold text-[#e4c98f]">
                {company.name}
              </p>
            </div>

            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl lg:text-[58px] lg:leading-[1.03]">
              Executive Workspace Enrollment
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Complete secure credential creation to activate controlled
              procurement workspace access for your verified identity.
            </p>

            <section className="mt-9 overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] shadow-[0_30px_90px_rgba(0,0,0,0.3)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 sm:px-8">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.23em] text-[#d6b977]">
                    Enrollment Summary
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Verified identity, role assignment, and workspace authority
                  </p>
                </div>
                <div className="hidden h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-400 sm:grid">
                  <BuildingIcon />
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  {company.logoUrl ? (
                    <Image
                      src={company.logoUrl}
                      alt={company.name}
                      width={88}
                      height={88}
                      className="h-20 w-20 rounded-[22px] border border-white/10 bg-white object-contain p-2 shadow-xl"
                    />
                  ) : (
                    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[22px] border border-[#c9a35d]/30 bg-gradient-to-br from-[#183a66] to-[#0a1c32] text-3xl font-semibold text-[#e4c98f] shadow-xl">
                      {company.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      Procurement workspace
                    </p>
                    <h2 className="mt-2 break-words text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">
                      {company.name}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {company.category}
                      <span className="mx-2 text-slate-600">•</span>
                      {company.location}
                    </p>
                  </div>
                </div>

                <dl className="mt-8 divide-y divide-white/8 rounded-2xl border border-white/8 bg-black/10 px-5">
                  <SummaryRow label="Authorized recipient" value={email} />
                  <SummaryRow label="Assigned role" value={role} />
                  <SummaryRow label="Security classification" value="Verified Access" />
                  <SummaryRow label="Enrollment status" value={status} />
                </dl>
              </div>
            </section>

            <section className="mt-7 rounded-[28px] border border-white/10 bg-[#071829]/80 p-6 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                    Access Activation Timeline
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Current position within the controlled onboarding workflow.
                  </p>
                </div>
                <span className="hidden rounded-full border border-[#c9a35d]/20 bg-[#c9a35d]/5 px-3 py-1.5 text-xs font-semibold text-[#d6b977] sm:inline">
                  Stage 3 of 4
                </span>
              </div>

              <ol className="mt-7 space-y-4">
                {timeline.map((item, index) => (
                  <li key={item.label} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={[
                          "grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xs font-bold",
                          item.state === "complete"
                            ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                            : item.state === "active"
                              ? "border-[#d6b977]/50 bg-[#c9a35d]/15 text-[#f0d89f] shadow-[0_0_30px_rgba(201,163,93,.2)]"
                              : "border-white/10 bg-white/[0.03] text-slate-600",
                        ].join(" ")}
                      >
                        {item.state === "complete" ? <CheckIcon /> : index + 1}
                      </div>
                      {index < timeline.length - 1 ? (
                        <div className="mt-2 h-8 w-px bg-white/10" />
                      ) : null}
                    </div>

                    <div className="pt-1">
                      <p
                        className={[
                          "text-sm font-semibold",
                          item.state === "active"
                            ? "text-white"
                            : item.state === "complete"
                              ? "text-slate-300"
                              : "text-slate-600",
                        ].join(" ")}
                      >
                        {item.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <div className="lg:sticky lg:top-8">{children}</div>
        </section>

        <footer className="border-t border-white/10 py-5 text-center text-xs leading-5 text-slate-600">
          Protected enrollment session · Access activity may be recorded for
          governance, audit, and security assurance.
        </footer>
      </div>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
      <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-sm font-semibold text-slate-200 sm:text-right">
        {value}
      </dd>
    </div>
  );
}
