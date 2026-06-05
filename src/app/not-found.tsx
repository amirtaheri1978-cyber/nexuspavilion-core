import Link from "next/link";

export default function NotFound() {
return (
<main className="flex min-h-screen items-center justify-center bg-[#f6f6f3] px-8">
<div className="max-w-2xl text-center">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Error 404
</p>

<h1 className="mt-4 text-6xl font-black text-slate-950">
Page Not Found
</h1>

<p className="mt-6 text-base leading-8 text-slate-600">
The page you are looking for does not exist or may have been moved.
</p>

<div className="mt-8 flex flex-wrap justify-center gap-4">
<Link
href="/"
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
Go Home
</Link>

<Link
href="/dashboard"
className="rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-950 shadow-sm"
>
Dashboard
</Link>
</div>
</div>
</main>
);
}