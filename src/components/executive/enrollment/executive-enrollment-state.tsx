"use client";

import Link from "next/link";

type ExecutiveEnrollmentStateProps = {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  tone?: "neutral" | "danger";
};

function ShieldIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-7 w-7 fill-none stroke-current stroke-[1.7]"
    >
      <path
        d="M12 3 5 6v5c0 4.7 2.9 8.2 7 10 4.1-1.8 7-5.3 7-10V6l-7-3Z"
        strokeLinejoin="round"
      />
      <path d="M9 12h6" strokeLinecap="round" />
    </svg>
  );
}

export function ExecutiveEnrollmentState({
  eyebrow,
  title,
  description,
  actionLabel,
  actionHref,
  tone = "neutral",
}: ExecutiveEnrollmentStateProps) {
  const danger = tone === "danger";

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#06111f] px-5 py-10 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_8%,rgba(36,99,235,.20),transparent_32%),radial-gradient(circle_at_78%_15%,rgba(201,155,61,.12),transparent_28%),linear-gradient(180deg,#071523_0%,#050d18_100%)]"
      />

      <section className="relative w-full max-w-xl rounded-[32px] border border-white/10 bg-[#091a2d]/92 p-7 text-center shadow-[0_35px_110px_rgba(0,0,0,.45)] backdrop-blur-2xl sm:p-10">
        <div
          className={[
            "mx-auto grid h-16 w-16 place-items-center rounded-2xl border",
            danger
              ? "border-rose-300/20 bg-rose-300/[0.07] text-rose-200"
              : "border-[#c9a35d]/25 bg-[#c9a35d]/10 text-[#e4c98f]",
          ].join(" ")}
        >
          <ShieldIcon />
        </div>

        <p
          className={[
            "mt-6 text-[11px] font-bold uppercase tracking-[0.23em]",
            danger ? "text-rose-200" : "text-[#d6b977]",
          ].join(" ")}
        >
          {eyebrow}
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
          {title}
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-400">
          {description}
        </p>

        <Link
          href={actionHref}
          className="mt-8 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#c49a4d] via-[#d6b977] to-[#c49a4d] px-6 py-3.5 text-sm font-bold text-[#102035] transition hover:-translate-y-0.5"
        >
          {actionLabel}
        </Link>
      </section>
    </main>
  );
}

export function ExecutiveEnrollmentLoading() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#06111f] px-5 py-10 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_8%,rgba(36,99,235,.20),transparent_32%),linear-gradient(180deg,#071523_0%,#050d18_100%)]"
      />
      <section
        aria-live="polite"
        aria-busy="true"
        className="relative w-full max-w-md rounded-[30px] border border-white/10 bg-[#091a2d]/92 p-8 text-center shadow-[0_35px_110px_rgba(0,0,0,.42)] backdrop-blur-xl"
      >
        <div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-white/10 border-t-[#d6b977]" />
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-[#d6b977]">
          Secure Enrollment
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-white">
          Validating invitation
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Confirming workspace authority and recipient identity.
        </p>
      </section>
    </main>
  );
}
