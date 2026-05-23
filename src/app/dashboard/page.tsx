import AppSidebar from "@/components/common/AppSidebar";
import AppTopbar from "@/components/common/AppTopbar";
import SandboxStrip from "@/components/common/SandboxStrip";

export default function DashboardPage() {
return (
<main className="min-h-screen bg-slate-100">
<SandboxStrip />

<div className="flex">
<AppSidebar />

<section className="flex-1 min-h-screen">
<AppTopbar />

<div className="p-8">
<h1 className="text-3xl font-bold text-slate-900">
Global Procurement Ledger
</h1>

<p className="mt-2 text-slate-600">
Explore active supply networks while your enterprise
verification is pending.
</p>

<div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="rounded-xl bg-white p-6 border border-slate-200">
<h3 className="font-semibold text-slate-900">
Directory Access
</h3>

<p className="mt-2 text-sm text-slate-600">
Public company listings are available in read-only mode.
</p>
</div>

<div className="rounded-xl bg-white p-6 border border-slate-200">
<h3 className="font-semibold text-slate-900">
Verification Status
</h3>

<p className="mt-2 text-sm text-amber-700">
Sandbox mode active.
</p>

<a
href="/verify"
className="mt-4 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition"
>
View Requirements
</a>
</div>

<div className="rounded-xl bg-white p-6 border border-slate-200">
<h3 className="font-semibold text-slate-900">
Locked Systems
</h3>

<p className="mt-2 text-sm text-slate-600">
RFQ, Project Matrix, and Blueprint Center unlock after approval.
</p>
</div>
</div>
</div>
</section>
</div>
</main>
);
} 