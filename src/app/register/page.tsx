export default function RegisterPage() {
return (
<main className="min-h-screen bg-slate-100 grid grid-cols-1 lg:grid-cols-[40%_60%]">

<section className="bg-[#111827] text-white p-10 flex flex-col justify-center">
<h1 className="text-4xl font-bold">
Join Nexus Pavilion
</h1>

<p className="mt-4 text-slate-300">
Initialize your enterprise node under Sandbox governance.
</p>
</section>

<section className="p-10 flex items-center justify-center">

<form className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 p-8 shadow-sm">

<h2 className="text-2xl font-bold text-slate-900">
Corporate Registration
</h2>

<p className="mt-2 text-slate-500 text-sm">
Register your organization to access enterprise governance systems.
</p>

<div className="mt-6 grid grid-cols-1 gap-4">

<input
className="border border-slate-300 rounded-lg p-3"
placeholder="Corporate Legal Name"
/>

<input
className="border border-slate-300 rounded-lg p-3"
placeholder="Tax ID / Business Number"
/>

<input
className="border border-slate-300 rounded-lg p-3"
placeholder="Corporate Email"
/>

<input
className="border border-slate-300 rounded-lg p-3"
placeholder="Phone Number"
/>

<input
className="border border-slate-300 rounded-lg p-3"
placeholder="Regional Hub"
/>

<input
className="border border-slate-300 rounded-lg p-3"
placeholder="Role Type"
/>

<input
className="border border-slate-300 rounded-lg p-3"
placeholder="Primary Category"
/>

</div>

<button
type="button"
className="mt-6 w-full rounded-lg bg-slate-900 px-5 py-3 text-white font-medium hover:bg-slate-800"
>
Initialize Sandbox Account
</button>

</form>

</section>

</main>
);
} 