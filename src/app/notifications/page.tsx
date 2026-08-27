import { redirect } from "next/navigation";

import { EXECUTIVE_PAGE_CLASS } from "@/lib/design-system/executive-contract";
import { createClient } from "@/lib/supabase/server";

type Notification = {
id: string;
title: string | null;
message: string | null;
type: string | null;
is_read: boolean | null;
created_at: string | null;
company_id?: string | null;
};

function formatNotificationDate(value: string | null) {
if (!value) return "No date";

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return "No date";
}

return date.toLocaleString();
}

function getNotificationTone(type: string | null) {
const value = String(type || "").toLowerCase();

if (value.includes("award")) return "success";
if (value.includes("risk") || value.includes("warning")) return "warning";
if (value.includes("invite") || value.includes("invitation")) return "blue";

return "neutral";
}

function isInvitationNotification(type: string | null) {
const value = String(type || "").toLowerCase();
return value.includes("invite") || value.includes("invitation");
}

export default async function NotificationsPage() {
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
redirect("/login");
}

const { data: profile } = await supabase
.from("profiles")
.select("id, company_id, role, email")
.eq("id", user.id)
.single();

if (!profile?.company_id) {
redirect("/create-company");
}

const { data: notifications } = await supabase
.from("notifications")
.select("id, title, message, type, is_read, created_at, company_id")
.eq("company_id", profile.company_id)
.order("created_at", { ascending: false });

const notificationList = (notifications ?? []) as Notification[];

const unreadCount = notificationList.filter(
(notification) => !notification.is_read,
).length;

const awardCount = notificationList.filter((notification) =>
String(notification.type || "").toLowerCase().includes("award"),
).length;

const inviteCount = notificationList.filter((notification) =>
isInvitationNotification(notification.type),
).length;

const totalCount = notificationList.length;

return (
<main className="relative min-h-screen overflow-hidden bg-[#061426] text-white">
<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />
<div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.055),transparent_32%,rgba(200,166,70,0.05)_66%,transparent)]" />

<div className={EXECUTIVE_PAGE_CLASS}>
<section className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_32px_110px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-8 lg:p-10">
<div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-[#C8A646]">
Executive Activity Center
</p>

<h1 className="mt-4 max-w-4xl break-words text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
Notifications
</h1>

<p className="mt-5 max-w-4xl text-sm font-semibold leading-7 text-slate-300 sm:text-base">
Monitor procurement events, supplier actions, contract awards,
invitations, risk signals, and platform activity scoped to your
company workspace.
</p>
</div>

<div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
<ActivityMetric title="Total Activity" value={totalCount} />
<ActivityMetric title="Unread" value={unreadCount} />
<ActivityMetric title="Awards" value={awardCount} />
<ActivityMetric title="Invitations" value={inviteCount} />
</div>
</div>
</section>

<section className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8">
<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Workspace Timeline
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Live Activity Feed
</h2>

<p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
Every activity shown here belongs to your company workspace and
supports procurement governance, visibility, and executive
follow-up.
</p>
</div>

<StatusBadge tone={unreadCount > 0 ? "warning" : "success"}>
{unreadCount > 0 ? `${unreadCount} Unread` : "All Clear"}
</StatusBadge>
</div>

<div className="mt-8 space-y-4">
{notificationList.length > 0 ? (
notificationList.map((notification) => (
<article
key={notification.id}
className="rounded-[30px] border border-white/10 bg-[#061426]/72 p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)]"
>
<div className="flex items-start justify-between gap-6">
<div className="min-w-0">
<div className="flex flex-wrap items-center gap-3">
<StatusBadge
tone={getNotificationTone(notification.type)}
>
{notification.type || "Activity"}
</StatusBadge>

<span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-slate-300">
Company Workspace
</span>

{!notification.is_read ? (
<span className="rounded-full border border-orange-300/20 bg-orange-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-orange-300">
Unread
</span>
) : null}
</div>

<h3 className="mt-4 text-xl font-black text-white">
{notification.title || "Notification"}
</h3>

<p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
{notification.message || "No message provided."}
</p>

<p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
{formatNotificationDate(notification.created_at)}
</p>
</div>

{!notification.is_read ? (
<div className="mt-2 h-3 w-3 shrink-0 rounded-full bg-[#C8A646] shadow-[0_0_24px_rgba(200,166,70,0.55)]" />
) : null}
</div>
</article>
))
) : (
<EmptyState />
)}
</div>
</section>
</div>
</main>
);
}

function ActivityMetric({ title, value }: { title: string; value: number }) {
return (
<div className="rounded-[26px] border border-white/10 bg-[#061426]/75 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-3xl font-black text-white">{value}</p>
</div>
);
}

function StatusBadge({
children,
tone = "neutral",
}: {
children: React.ReactNode;
tone?: "success" | "warning" | "blue" | "neutral";
}) {
const toneClass =
tone === "success"
? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
: tone === "warning"
? "border-orange-300/20 bg-orange-400/10 text-orange-300"
: tone === "blue"
? "border-[#2CC4E8]/25 bg-[#2CC4E8]/10 text-[#9BE8F8]"
: "border-white/10 bg-white/[0.055] text-slate-300";

return (
<span
className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${toneClass}`}
>
{children}
</span>
);
}

function EmptyState() {
return (
<div className="rounded-[30px] border border-dashed border-white/15 bg-white/[0.035] p-12 text-center">
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Activity Center
</p>

<h3 className="mt-4 text-3xl font-black text-white">
No notifications yet
</h3>

<p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-400">
Procurement activity, supplier actions, contract awards, invitations,
and workspace events will appear here once your team starts operating.
</p>
</div>
);
}