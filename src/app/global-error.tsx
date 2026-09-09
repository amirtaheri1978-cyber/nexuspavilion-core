"use client";

import * as Sentry from "@sentry/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

import "./globals.css";

const BRAND_LOGO_SRC = "/branding/logo-horizontal-512.png";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Nexus Pavilion root application boundary:", error);
    try {
      Sentry.captureException(error);
    } catch {
      // Monitoring must remain fail-open relative to recovery UI.
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#07111F] antialiased text-white">
        <main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 sm:px-6 lg:px-10">
          <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

          <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[720px] items-center">
            <div className="w-full rounded-[40px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10">
              <div className="inline-flex rounded-[30px] border border-white/10 bg-white/[0.06] p-2">
                <div className="rounded-[24px] border border-white/10 bg-black px-6 py-5">
                  <Image
                    src={BRAND_LOGO_SRC}
                    alt="Nexus Pavilion"
                    width={240}
                    height={88}
                    className="h-[72px] w-auto object-contain"
                    priority
                  />
                </div>
              </div>

              <p className="mt-8 text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
                Secure Workspace Protection
              </p>

              <h1 className="mt-5 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
                Something interrupted your secure workspace.
              </h1>

              <p className="mt-5 text-base font-semibold leading-8 text-slate-300">
                Nexus Pavilion could not complete this request safely. Your
                workspace session and procurement data remain protected.
              </p>

              <div className="mt-9 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => reset()}
                  className="flex h-[58px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 text-center text-sm font-black uppercase tracking-[0.12em] text-slate-950"
                >
                  Try Again
                </button>

                <Link
                  href="/dashboard"
                  className="flex h-[58px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] px-5 text-center text-sm font-black text-white"
                >
                  Return to Dashboard
                </Link>
              </div>

              {error.digest ? (
                <p className="mt-6 text-xs font-bold leading-5 text-slate-500">
                  Reference ID: {error.digest}
                </p>
              ) : null}
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
