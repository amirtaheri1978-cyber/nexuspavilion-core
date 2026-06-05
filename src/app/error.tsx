"use client";

import Link from "next/link";

export default function GlobalError({
error,
reset,
}: {
error: Error;
reset: () => void;
}) {
return (
<main className="flex min-h-screen items-center justify-center bg-[#f6f6f3] px-8">
<div className="max-w-2xl text-center">
<p className="text-xs font-black uppercase tracking-[0.35em] text-red-500">
Application Error
</p>

<h1 className="mt-4 text-5xl font-black text-slate-950">
Something went wrong
</h1>

<p className="mt-6 text-sm leading-7 text-slate-600">
{error?.message ||
"An unexpected error occurred while loading this page."}
</p>

<div className="mt-8 flex flex-wrap justify-center gap-4">
<button
onClick={() => reset()}
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
Try Again
</button>

<Link
href="/"
className="rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-950 shadow-sm"
>
Home
</Link>
</div>
</div>
</main>
);
}