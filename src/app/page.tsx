import RegisterForm from "@/components/forms/RegisterForm";

export default function RegisterPage() {
return (
<main className="flex min-h-screen w-full overflow-hidden bg-slate-50 font-sans">
<section className="hidden w-[40%] flex-col justify-between bg-[#111827] p-12 text-white md:flex">
<div>
<h2 className="text-xl font-bold tracking-tight">
Nexus Pavilion
</h2>
</div>

<div className="my-auto space-y-4">
<h1 className="text-4xl font-extrabold tracking-tight">
Join Nexus Pavilion
</h1>

<p className="max-w-sm text-sm leading-relaxed text-slate-400">
Initialize your enterprise node under Sandbox governance.
</p>
</div>

<div className="text-xs text-slate-500">
© 2026 Nexus Pavilion. All rights reserved.
</div>
</section>

<section className="flex flex-1 items-center justify-center px-6 py-12 sm:px-16 lg:px-24">
<RegisterForm />
</section>
</main>
);
} 