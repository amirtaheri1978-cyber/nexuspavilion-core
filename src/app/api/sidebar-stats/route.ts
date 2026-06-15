import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
return NextResponse.json({
activeRfqs: 0,
unreadNotifications: 0,
awardedContracts: 0,
supplierQuotes: 0,
});
}

const { data: profile } = await supabase
.from("profiles")
.select("id, company_id, role")
.eq("id", user.id)
.maybeSingle();

if (!profile?.company_id) {
return NextResponse.json({
activeRfqs: 0,
unreadNotifications: 0,
awardedContracts: 0,
supplierQuotes: 0,
});
}

const { data: rfqs } = await supabase
.from("rfqs")
.select("id, status")
.eq("company_id", profile.company_id);

const rfqIds = (rfqs ?? []).map((rfq) => rfq.id);

const { data: quotes } =
rfqIds.length > 0
? await supabase
.from("quotes")
.select("id, decision")
.in("rfq_id", rfqIds)
: { data: [] };

const { data: notifications } = await supabase
.from("notifications")
.select("id, is_read")
.eq("company_id", profile.company_id);

const activeRfqs =
rfqs?.filter((rfq) => !rfq.status || rfq.status === "open").length ?? 0;

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