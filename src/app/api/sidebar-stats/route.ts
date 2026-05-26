import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
const supabase = await createClient();

const { data: rfqs } = await supabase.from("rfqs").select("id, status");
const { data: quotes } = await supabase.from("quotes").select("id, decision");
const { data: notifications } = await supabase
.from("notifications")
.select("id, is_read");

const activeRfqs =
rfqs?.filter((rfq) => rfq.status !== "awarded").length ?? 0;

const awardedContracts =
quotes?.filter((quote) => quote.decision === "awarded").length ?? 0;

const supplierQuotes = quotes?.length ?? 0;

const unreadNotifications =
notifications?.filter((notification) => !notification.is_read).length ?? 0;

return NextResponse.json({
activeRfqs,
unreadNotifications,
awardedContracts,
supplierQuotes,
});
}