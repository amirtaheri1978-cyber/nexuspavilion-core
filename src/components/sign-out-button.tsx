"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
const router = useRouter();
const supabase = createClient();

async function handleSignOut() {
await supabase.auth.signOut();
router.push("/login");
router.refresh();
}

return (
<div className="group relative">
<button
type="button"
className="flex items-center gap-3 rounded-full border border-white/10 bg-[#061426]/90 px-3 py-2 text-left text-white shadow-executive backdrop-blur transition hover:border-[#2CC4E8]/30 hover:bg-[#07111F]"
>
<NexusPavilionLogo variant="icon" size={32} />

<div className="hidden min-w-0 xl:block">
<p className="text-xs font-black leading-none text-white">
Executive Workspace
</p>
<p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
Verified Access
</p>
</div>

<span className="hidden text-slate-500 transition group-hover:text-[#9BE8F8] xl:inline">
▾
</span>
</button>

<div className="invisible absolute right-0 z-50 mt-3 w-72 translate-y-2 rounded-[24px] border border-white/10 bg-[#061426] p-3 opacity-0 shadow-executive transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
<div className="rounded-[18px] border border-white/10 bg-white/[0.045] p-4">
<p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8A646]">
Nexus Pavilion
</p>
<p className="mt-2 text-sm font-black text-white">
Executive Workspace
</p>
<p className="mt-1 text-xs font-semibold text-slate-500">
Secure enterprise session
</p>
</div>

<div className="mt-3 space-y-1">
<MenuLink href="/dashboard">Profile Overview</MenuLink>
<MenuLink href="/company/settings">Company Command</MenuLink>
<MenuLink href="/company/settings">Settings</MenuLink>
<MenuLink href="/notifications">Activity Center</MenuLink>
</div>

<div className="mt-3 border-t border-white/10 pt-3">
<button
type="button"
onClick={handleSignOut}
className="flex w-full items-center justify-between rounded-[16px] border border-red-300/15 bg-red-400/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-400/15"
>
Secure Logout
<span aria-hidden="true">⏻</span>
</button>
</div>
</div>
</div>
);
}

function MenuLink({
href,
children,
}: {
href: string;
children: React.ReactNode;
}) {
return (
<Link
href={href}
className="block rounded-[16px] px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/[0.055] hover:text-white"
>
{children}
</Link>
);
}