import Link from "next/link";

const BRAND_LOGO_SRC = "/branding/logo-horizontal-512.png";

const NAVIGATION_OPTIONS = [
"Return to Dashboard",
"Go to Home",
"Continue Procurement",
"Executive Workspace",
];

export default function NotFound() {
return (
<main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

<div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_34%,rgba(200,166,70,0.05)_68%,transparent)]" />

<section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[1460px] items-center gap-8 lg:grid-cols-[0.82fr_1.18fr] xl:gap-10">
<aside className="rounded-[38px] border border-white/10 bg-white/[0.045] p-7 shadow-[0_32px_110px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-9 lg:p-11 xl:p-12">
<BrandTile />

<p className="mt-10 text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
Enterprise Navigation
</p>

<h1 className="mt-5 max-w-2xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[64px] xl:leading-[0.98]">
This workspace page is not available.
</h1>

<p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-slate-300 xl:text-lg">
The page may have moved, been removed, or the link is no longer
available. Your enterprise workspace and procurement information
remain secure.
</p>

<div className="mt-9 grid gap-3 sm:grid-cols-2">
{NAVIGATION_OPTIONS.map((item) => (
<div
key={item}
className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-black text-slate-200"
>
<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#C8A646]/30 bg-[#C8A646]/10 text-xs text-[#F5D77B]">
✓
</span>

<span>{item}</span>
</div>
))}
</div>

<div className="mt-9 rounded-3xl border border-white/10 bg-[#07111F]/75 p-5">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
Navigation Assistance
</p>

<p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
Use the dashboard or homepage to continue working safely inside
your company workspace.
</p>
</div>
</aside>

<section className="mx-auto w-full max-w-[700px] rounded-[40px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10 lg:p-12 xl:p-14">
<div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-2xl font-black text-[#F5D77B]">
404
</div>

<p className="mt-8 text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
Workspace Unavailable
</p>

<h2 className="mt-5 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[58px]">
We could not find this page.
</h2>

<p className="mt-5 text-base font-semibold leading-8 text-slate-300">
The destination you are looking for is not available anymore or may
require a different secure workspace path.
</p>

<div className="mt-9 grid gap-3 sm:grid-cols-2">
<Link
href="/dashboard"
className="flex h-[58px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 text-center text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.3)] transition hover:scale-[1.01]"
>
Dashboard
</Link>

<Link
href="/"
className="flex h-[58px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] px-5 text-center text-sm font-black text-white transition hover:bg-white/[0.08]"
>
Home
</Link>
</div>

<div className="mt-4">
<Link
href="/contact"
className="flex h-[54px] items-center justify-center rounded-2xl border border-white/10 bg-[#07111F]/75 px-5 text-center text-sm font-black text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
>
Contact Support
</Link>
</div>

<div className="mt-8 rounded-3xl border border-white/10 bg-[#07111F]/75 p-5">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
Enterprise Notice
</p>

<p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
If you reached this page from an email invitation or saved link,
request a new secure link from your company administrator.
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
<img
src={BRAND_LOGO_SRC}
alt="Nexus Pavilion"
className="h-[72px] w-auto object-contain sm:h-[82px] xl:h-[88px]"
/>
</div>
</div>
);
}