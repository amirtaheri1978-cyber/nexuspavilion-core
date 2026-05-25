import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function generateToken() {
return crypto.randomUUID().replaceAll("-", "");
}

export async function POST(request: Request) {
try {
const body = await request.json();

const { rfqId, email } = body;

if (!rfqId || !email) {
return NextResponse.json(
{ error: "RFQ ID and email are required." },
{ status: 400 }
);
}

const supabase = await createClient();

const token = generateToken();

const { data: invite, error } = await supabase
.from("rfq_invites")
.insert({
rfq_id: rfqId,
email,
token,
status: "sent",
})
.select()
.single();

if (error) {
console.error(error);

return NextResponse.json(
{ error: "Could not create invite." },
{ status: 500 }
);
}

return NextResponse.json({
invite,
inviteUrl: `/rfq/invite/${token}`,
});
} catch (error) {
console.error(error);

return NextResponse.json(
{ error: "Server error." },
{ status: 500 }
);
}
}