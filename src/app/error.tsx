"use client";

import Link from "next/link";
import { useEffect } from "react";
import Image from "next/image";

const BRAND_LOGO_SRC = "/branding/logo-horizontal-512.png";

export default function GlobalError({
error,
reset,
}: {
error: Error & { digest?: string };
reset: () => void;
}) {
useEffect(() => {
console.error("Nexus Pavilion application boundary:", error);
}, [error]);

return (
<main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

<div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_34%,rgba(200,166,70,0.05)_68%,transparent)]" />

<section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[1460px] items-center gap-8 lg:grid-cols-[0.82fr_1.18fr] xl:gap-10">
<aside className="rounded-[38px] border border-white/10 bg-white/[0.045] p-7 shadow-[0_32px_110px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-9 lg:p-11 xl:p-12">
<BrandTile />

<p className="mt-10 text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
Secure Workspace Protection
</p>

<h1 className="mt-5 max-w-2xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[64px] xl:leading-[0.98]">
Something interrupted your secure workspace.
</h1>

<p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-slate-300 xl:text-lg">
Nexus Pavilion could not complete this page request safely. Your
workspace session and procurement data remain protected.
</p>

<div className="mt-9 grid gap-3 sm:grid-cols-2">
<TrustSignal label="Workspace protected" />
<TrustSignal label="No action was completed" />
<TrustSignal label="Safe retry available" />
<TrustSignal label="Enterprise access preserved" />
</div>

<div className="mt-9 rounded-3xl border border-white/10 bg-[#07111F]/75 p-5">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
Recommended Action
</p>
<p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
Try loading the page again. If the issue continues, return to your
dashboard and continue from a secure workspace entry point.
</p>
</div>
</aside>

<section className="mx-auto w-full max-w-[700px] rounded-[40px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10 lg:p-12 xl:p-14">
<div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-300/20 bg-red-400/10 text-2xl font-black text-red-200">
!
</div>

<p className="mt-8 text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
Request Interrupted
</p>

<h2 className="mt-5 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[58px]">
We could not load this page securely.
</h2>

<p className="mt-5 text-base font-semibold leading-8 text-slate-300">
The request was stopped before the page could be completed. Please
try again or return to a safe workspace destination.
</p>

<div className="mt-9 grid gap-3 sm:grid-cols-2">
<button
type="button"
onClick={() => reset()}
className="flex h-[58px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 text-center text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.3)] transition hover:scale-[1.01]"
>
Try Again
</button>

<Link
href="/dashboard"
className="flex h-[58px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] px-5 text-center text-sm font-black text-white transition hover:bg-white/[0.08]"
>
Return to Dashboard
</Link>
</div>

<div className="mt-4">
<Link
href="/login"
className="flex h-[54px] items-center justify-center rounded-2xl border border-white/10 bg-[#07111F]/75 px-5 text-center text-sm font-black text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
>
Sign In Again
</Link>
</div>

<div className="mt-8 rounded-3xl border border-white/10 bg-[#07111F]/75 p-5">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
Support Reference
</p>
<p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
If this continues, contact your workspace administrator or Nexus
Pavilion support. Do not share passwords, invitation tokens, or
private procurement data.
</p>
</div>

{error.digest ? (
<div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
<p className="text-xs font-bold leading-5 text-slate-500">
Reference ID: {error.digest}
</p>
</div>
) : null}
</section>
</section>
</main>
);
}

function BrandTile() {
return (
<div className="inline-flex rounded-[30px] border border-white/10 bg-white/[0.06] p-2 shadow-[0_22px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl">
<div className="rounded-[24px] border border-white/10 bg-black px-6 py-5">
<Image
src={BRAND_LOGO_SRC}
alt="Nexus Pavilion"
width={240}
height={88}
className="h-[72px] w-auto object-contain sm:h-[82px] xl:h-[88px]"
priority
/>
</div>
</div>
);
}

function TrustSignal({ label }: { label: string }) {
return (
<div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-black text-slate-200">
<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#C8A646]/30 bg-[#C8A646]/10 text-xs text-[#F5D77B]">
✓
</span>
<span>{label}</span>
</div>
);
}