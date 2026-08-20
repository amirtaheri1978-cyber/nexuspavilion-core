"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

const BRAND_LOGO_SRC = "/branding/logo-horizontal-512.png";

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
primaryLabel: string;
primaryHref: string;
secondaryLabel: string;
secondaryHref: string;
}
> = {
success: {
eyebrow: "Email Verified",
title: "Your enterprise identity is verified.",
description:
"Your email has been confirmed successfully. You can now continue setting up your Nexus Pavilion workspace.",
icon: "✓",
primaryLabel: "Continue to Company Setup",
primaryHref: "/create-company",
secondaryLabel: "Go to Dashboard",
secondaryHref: "/dashboard",
},
expired: {
eyebrow: "Verification Link Expired",
title: "This secure link is no longer valid.",
description:
"For your protection, verification links expire after a limited time. Please request a new verification email or sign in again.",
icon: "!",
primaryLabel: "Back to Sign In",
primaryHref: "/login",
secondaryLabel: "Create Account",
secondaryHref: "/signup",
},
already: {
eyebrow: "Already Verified",
title: "Your email is already confirmed.",
description:
"This account has already completed email verification. Continue to your secure workspace.",
icon: "✓",
primaryLabel: "Continue to Dashboard",
primaryHref: "/dashboard",
secondaryLabel: "Back to Sign In",
secondaryHref: "/login",
},
error: {
eyebrow: "Verification Unavailable",
title: "We could not verify this link.",
description:
"The verification request could not be completed securely. Please sign in again or request a new verification email.",
icon: "!",
primaryLabel: "Back to Sign In",
primaryHref: "/login",
secondaryLabel: "Create Account",
secondaryHref: "/signup",
},
pending: {
eyebrow: "Verify Your Email",
title: "Check your inbox to verify your account.",
description:
"We sent a secure verification link to your email address. Confirm your email before continuing to your enterprise workspace.",
icon: "→",
primaryLabel: "Back to Sign In",
primaryHref: "/login",
secondaryLabel: "Create Account",
secondaryHref: "/signup",
},
};

const verificationSignals = [
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

return (
<main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

<div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_34%,rgba(200,166,70,0.05)_68%,transparent)]" />

<section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[1560px] items-center gap-8 lg:grid-cols-[0.82fr_1.18fr] xl:gap-10">
<aside className="rounded-[38px] border border-white/10 bg-white/[0.045] p-7 shadow-[0_32px_110px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-9 lg:p-11 xl:p-12">
<BrandTile />

<p className="mt-10 text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
Enterprise Email Verification
</p>

<h1 className="mt-5 max-w-2xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[64px] xl:leading-[0.98]">
Confirm your secure enterprise identity.
</h1>

<p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-slate-300 xl:text-lg">
Email verification protects company workspaces, procurement data,
RFQ access, supplier collaboration, and executive reporting across
Nexus Pavilion.
</p>

<div className="mt-9 grid gap-3 sm:grid-cols-2">
{verificationSignals.map((signal) => (
<div
key={signal}
className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-black text-slate-200"
>
<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#C8A646]/30 bg-[#C8A646]/10 text-xs text-[#F5D77B]">
✓
</span>
<span>{signal}</span>
</div>
))}
</div>

<div className="mt-9 rounded-3xl border border-white/10 bg-[#07111F]/75 p-5">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
Protected Access Flow
</p>
<p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
Verification ensures that only confirmed users can activate or
access company-level procurement workspaces.
</p>
</div>
</aside>

<section className="mx-auto w-full max-w-[700px] rounded-[40px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10 lg:p-12 xl:p-14">
<div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#C8A646]/25 bg-[#C8A646]/10 text-2xl font-black text-[#F5D77B]">
{content.icon}
</div>

<p className="mt-8 text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
{content.eyebrow}
</p>

<h2 className="mt-5 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[58px]">
{content.title}
</h2>

<p className="mt-5 text-base font-semibold leading-8 text-slate-300">
{content.description}
</p>

<div className="mt-9 grid gap-3 sm:grid-cols-2">
<Link
href={content.primaryHref}
className="flex h-[58px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 text-center text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.3)] transition"
>
{content.primaryLabel}
</Link>

<Link
href={content.secondaryHref}
className="flex h-[58px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] px-5 text-center text-sm font-black text-white transition hover:bg-white/[0.08]"
>
{content.secondaryLabel}
</Link>
</div>

<div className="mt-8 rounded-3xl border border-white/10 bg-[#07111F]/75 p-5">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
Need Help?
</p>
<p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
If you did not receive an email or the link no longer works, sign
in again or create a new account request using your work email.
</p>
</div>

<div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
<p className="text-xs font-bold leading-5 text-slate-400">
🔒 Email verification protected by Nexus Pavilion Security.
</p>
</div>
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
priority
className="h-[72px] w-auto object-contain sm:h-[82px] xl:h-[88px]"
/>
</div>
</div>
);
}