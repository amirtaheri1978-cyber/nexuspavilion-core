import { NextResponse } from "next/server";

import {
  getProcurementContext,
  ProcurementContextError,
} from "@/lib/procurement/procurement-context-repository";
import { createClient } from "@/lib/supabase/server";

type SidebarStats = {
  activeRfqs: number;
  unreadNotifications: number;
  awardedContracts: number;
  supplierQuotes: number;
  experience: "buyer" | "supplier" | "consultant" | "hybrid";
};

const EMPTY_STATS: SidebarStats = {
  activeRfqs: 0,
  unreadNotifications: 0,
  awardedContracts: 0,
  supplierQuotes: 0,
  experience: "buyer",
};

function getRoleSpecificStats(
  context: Awaited<ReturnType<typeof getProcurementContext>>,
) {
  const { experience, buyer, supplier } = context;

  if (
    experience.mode === "supplier" ||
    experience.mode === "consultant"
  ) {
    return {
      activeRfqs: supplier.openOpportunities.length,
      awardedContracts: supplier.awardedQuotes.length,
      supplierQuotes: supplier.submittedQuotes.length,
    };
  }

  if (experience.mode === "hybrid") {
    return {
      activeRfqs: supplier.openOpportunities.length,
      awardedContracts: supplier.awardedQuotes.length,
      supplierQuotes: supplier.submittedQuotes.length,
    };
  }

  return {
    activeRfqs: buyer.openOwnedRfqs.length,
    awardedContracts: buyer.issuedAwards.length,
    supplierQuotes: buyer.receivedQuotes.length,
  };
}

export async function GET() {
  try {
    const context = await getProcurementContext();
    const supabase = await createClient();

    const { data: notifications, error: notificationsError } =
      context.identity.companyId
        ? await supabase
            .from("notifications")
            .select("id, is_read")
            .eq("company_id", context.identity.companyId)
        : { data: [], error: null };

    if (notificationsError) {
      console.error(
        "[Sidebar Stats] Unable to load notifications",
        notificationsError,
      );
    }

    const roleSpecificStats = getRoleSpecificStats(context);

    const unreadNotifications =
      notifications?.filter((notification) => !notification.is_read)
        .length ?? 0;

    return NextResponse.json({
      ...roleSpecificStats,
      unreadNotifications,
      experience: context.experience.mode,
    } satisfies SidebarStats);
  } catch (error) {
    if (error instanceof ProcurementContextError) {
      console.error("[Sidebar Stats] Procurement context failure", {
        message: error.message,
        cause: error.causeDetails,
      });
    } else {
      console.error("[Sidebar Stats] Unexpected failure", error);
    }

    return NextResponse.json(EMPTY_STATS, { status: 500 });
  }
}