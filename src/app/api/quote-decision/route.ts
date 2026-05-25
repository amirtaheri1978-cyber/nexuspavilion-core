import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
try {
const body = await request.json();

const { quoteId, decision } = body;

const supabase = await createClient();

const { error } = await supabase
.from("quotes")
.update({
decision,
})
.eq("id", quoteId);

if (error) {
console.error(error);

return NextResponse.json(
{ error: error.message },
{ status: 500 }
);
}

return NextResponse.json({
success: true,
});
} catch (error) {
console.error(error);

return NextResponse.json(
{
error: "Server error",
},
{
status: 500,
}
);
}
}