"use client";

import { useRouter } from "next/navigation";
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
<button
onClick={handleSignOut}
className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
>
Sign out
</button>
);
}