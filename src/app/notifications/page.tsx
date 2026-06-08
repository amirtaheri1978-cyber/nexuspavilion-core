import { createClient } from "@/lib/supabase/server";

type Notification = {
id: string;
title: string | null;
message: string | null;
type: string | null;
is_read: boolean | null;
created_at: string | null;
};

export default async function NotificationsPage() {
const supabase = await createClient();

const { data: notifications } = await supabase
.from("notifications")
.select("id, title, message, type, is_read, created_at")
.order("created_at", { ascending: false });

const notificationList = (notifications ?? []) as Notification[];

return (
<main className="min-h-screen bg-slate-100 px-8 py-10">
<div className="mx-auto max-w-5xl">
<div className="rounded-3xl border border-slate-200 bg-white p-10">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Activity Center
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Notifications
</h1>

<p className="mt-4 max-w-2xl text-sm text-slate-600">
Monitor procurement events, supplier actions, contract awards, and
platform activity across Nexus Pavilion.
</p>
</div>

<div className="mt-8 space-y-4">
{notificationList.length > 0 ? (
notificationList.map((notification) => (
<div
key={notification.id}
className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
>
<div className="flex items-start justify-between gap-6">
<div>
<h2 className="text-lg font-black text-slate-950">
{notification.title || "Notification"}
</h2>

<p className="mt-2 text-sm text-slate-600">
{notification.message || "No message provided."}
</p>

<div className="mt-4 flex flex-wrap items-center gap-3">
<span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-700">
{notification.type || "activity"}
</span>

<span className="text-xs font-semibold text-slate-400">
{notification.created_at
? new Date(notification.created_at).toLocaleString()
: "No date"}
</span>
</div>
</div>

{!notification.is_read ? (
<div className="mt-2 h-3 w-3 rounded-full bg-orange-500" />
) : null}
</div>
</div>
))
) : (
<div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
<p className="text-lg font-bold text-slate-700">
No notifications yet
</p>

<p className="mt-2 text-sm text-slate-500">
Procurement activity will appear here.
</p>
</div>
)}
</div>
</div>
</main>
);
}