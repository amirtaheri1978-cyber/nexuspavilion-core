import Link from "next/link";
import { redirect } from "next/navigation";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import {
  EXECUTIVE_FOCUS_CYAN,
  EXECUTIVE_PAGE_CLASS,
} from "@/lib/design-system/executive-contract";
import {
  classifyActivityView,
  prioritizeAttentionRows,
  resolveRfqSourceHref,
  type ActivityView,
} from "@/lib/procurement/activity-center-prioritization";
import { createClient } from "@/lib/supabase/server";

type Notification = {
  id: string;
  title: string | null;
  message: string | null;
  type: string | null;
  is_read: boolean | null;
  created_at: string | null;
  company_id?: string | null;
  source_rfq_id?: string | null;
};

type SourceRfq = {
  id: string;
  slug: string | null;
};

const VIEW_ITEMS: Array<{ id: ActivityView; label: string; href: string }> = [
  {
    id: "attention",
    label: "Needs Attention",
    href: "/notifications?view=attention",
  },
  { id: "updates", label: "Updates", href: "/notifications?view=updates" },
  { id: "history", label: "History", href: "/notifications?view=history" },
];

function isInvitationNotification(type: string | null) {
  const value = String(type || "").toLowerCase();
  return value.includes("invite") || value.includes("invitation");
}

function resolveActivityView(
  value: string | string[] | undefined,
): ActivityView {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "updates") return "updates";
  if (raw === "history") return "history";
  return "attention";
}

function getEnterpriseEventLabel(type: string | null) {
  const value = String(type || "");
  if (value === "addendum_action_required") {
    return "Addendum Acknowledgement Required";
  }
  if (value === "rfi_response") return "RFI Response";
  if (value === "addendum_acknowledgement") {
    return "Addendum Acknowledgement";
  }
  if (value === "approved_vendor") return "Approved Vendor";
  if (value === "supplier_compliance") return "Supplier Compliance";
  if (value === "quote") return "Quote";
  if (value === "rfi") return "RFI";
  if (value === "rfq") return "RFQ";
  if (value === "addendum") return "Addendum";
  if (value === "award") return "Award";
  if (value === "company") return "Company";
  if (value === "invitation") return "Invitation";
  return "Activity";
}

function getEventTone(
  type: string | null,
): "warning" | "success" | "blue" | "neutral" {
  const view = classifyActivityView(type);
  const value = String(type || "");

  if (view === "attention") return "warning";
  if (value === "award") return "success";
  if (view === "updates") return "blue";
  return "neutral";
}

function formatNotificationDate(value: string | null) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No date";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
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
    .select(
      "id, title, message, type, is_read, created_at, company_id, source_rfq_id",
    )
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  const notificationList = (notifications ?? []) as Notification[];

  const sourceRfqIds = Array.from(
    new Set(
      notificationList
        .map((notification) => notification.source_rfq_id)
        .filter((sourceRfqId): sourceRfqId is string => Boolean(sourceRfqId)),
    ),
  );

  const sourceRfqSlugById = new Map<string, string>();

  if (sourceRfqIds.length > 0) {
    const { data: sourceRfqs, error: sourceRfqError } = await supabase
      .from("rfqs")
      .select("id, slug")
      .in("id", sourceRfqIds);

    if (sourceRfqError) {
      console.error("Activity Center RFQ source resolution failed:", sourceRfqError);
    } else {
      for (const sourceRfq of (sourceRfqs ?? []) as SourceRfq[]) {
        if (sourceRfq.id && sourceRfq.slug) {
          sourceRfqSlugById.set(sourceRfq.id, sourceRfq.slug);
        }
      }
    }
  }

  const attentionRows = prioritizeAttentionRows(
    notificationList.filter(
      (notification) => classifyActivityView(notification.type) === "attention",
    ),
  );
  const updateRows = notificationList.filter(
    (notification) => classifyActivityView(notification.type) === "updates",
  );

  const params = await searchParams;
  const view = resolveActivityView(params.view);
  const visibleRows =
    view === "attention"
      ? attentionRows
      : view === "updates"
        ? updateRows
        : notificationList;

  const emptyCopy =
    view === "attention"
      ? {
          title: "No current activity signals require review.",
          body: "Current workflow status remains authoritative in Procurement Center and the RFQ workspace.",
        }
      : view === "updates"
        ? {
            title: "No recent informational activity.",
            body: "Informational RFQ, invitation, addendum, award, and company events appear here as they are recorded.",
          }
        : {
            title: "No company activity has been recorded yet.",
            body: "The complete company-scoped activity timeline appears here in chronological order.",
          };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#061426] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.055),transparent_32%,rgba(200,166,70,0.05)_66%,transparent)]" />

      <div className={EXECUTIVE_PAGE_CLASS}>
        <ExecutivePanel variant="operational" padding="lg">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#C8A646]">
                Executive Activity Center
              </p>
              <h1 className="mt-4 max-w-4xl break-words text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
                Activity Center
              </h1>
              <p className="mt-5 max-w-4xl text-sm font-semibold leading-7 text-slate-300 sm:text-base">
                Company-scoped activity signals and updates. Current workflow
                status remains authoritative in Procurement Center and the RFQ
                workspace.
              </p>
            </div>

            <Link
              href="/rfq"
              className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-black text-white transition-colors hover:bg-white/[0.06] ${EXECUTIVE_FOCUS_CYAN}`}
            >
              Open Procurement Center
            </Link>
          </div>

          <div className="mt-8 grid min-w-0 gap-4 sm:grid-cols-3">
            <ExecutiveMetricCard
              label="Attention Signals"
              value={String(attentionRows.length)}
              tone="gold"
            />
            <ExecutiveMetricCard
              label="Updates"
              value={String(updateRows.length)}
              tone="blue"
            />
            <ExecutiveMetricCard
              label="Total Activity"
              value={String(notificationList.length)}
            />
          </div>
        </ExecutivePanel>

        <nav
          aria-label="Activity Center views"
          className="mt-6 flex flex-wrap gap-2"
        >
          {VIEW_ITEMS.map((item) => {
            const selected = view === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={selected ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-black ${EXECUTIVE_FOCUS_CYAN} ${
                  selected
                    ? "border-white/20 bg-white text-slate-950"
                    : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {view === "attention" ? (
          <p className="mt-3 max-w-4xl text-xs font-semibold leading-6 text-slate-400">
            Needs Attention is ordered by action obligation first and recency
            second. RFQ source links appear only when the source can be resolved
            through your current authorized RFQ access.
          </p>
        ) : null}

        <ExecutivePanel
          className="mt-4 overflow-hidden"
          padding="none"
          variant="operational"
        >
          {visibleRows.length === 0 ? (
            <div className="px-6 py-12 sm:px-8">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
                {view === "attention"
                  ? "Needs Attention"
                  : view === "updates"
                    ? "Updates"
                    : "History"}
              </p>
              <p className="mt-4 text-2xl font-black text-white">
                {emptyCopy.title}
              </p>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-400">
                {emptyCopy.body}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/10">
              {visibleRows.map((notification) => {
                const invitation = isInvitationNotification(notification.type);
                const label = getEnterpriseEventLabel(notification.type);
                const tone =
                  invitation && notification.type === "invitation"
                    ? "blue"
                    : getEventTone(notification.type);
                const badgeLabel =
                  notification.type === "addendum_action_required"
                    ? "Acknowledgement Required"
                    : label;
                const sourceHref = resolveRfqSourceHref(
                  notification.source_rfq_id,
                  sourceRfqSlugById,
                );
                const hasDeclaredRfqSource = Boolean(
                  notification.source_rfq_id,
                );

                return (
                  <li key={notification.id} className="px-5 py-4 sm:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                          {label}
                        </p>
                        <p className="mt-2 text-sm font-black text-white">
                          {notification.title}
                        </p>
                        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-400">
                          {notification.message}
                        </p>

                        {sourceHref ? (
                          <div className="mt-3">
                            <Link
                              href={sourceHref}
                              className={`inline-flex min-h-10 items-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-3 text-xs font-black text-cyan-100 transition-colors hover:bg-cyan-300/[0.1] ${EXECUTIVE_FOCUS_CYAN}`}
                            >
                              Source Â· Open RFQ Workspace
                            </Link>
                          </div>
                        ) : hasDeclaredRfqSource ? (
                          <p className="mt-3 text-xs font-bold text-slate-500">
                            RFQ source is not available under the current
                            workspace access.
                          </p>
                        ) : null}

                        <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                          {formatNotificationDate(notification.created_at)}
                        </p>
                      </div>
                      <ExecutiveBadge tone={tone}>{badgeLabel}</ExecutiveBadge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ExecutivePanel>
      </div>
    </main>
  );
}
