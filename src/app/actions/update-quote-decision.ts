"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function updateQuoteDecision(
quoteId: string,
decision: "approved" | "rejected",
slug: string
) {
const supabase = await createClient();

await supabase
.from("quotes")
.update({
decision,
})
.eq("id", quoteId);

revalidatePath(`/rfq/${slug}`);
}