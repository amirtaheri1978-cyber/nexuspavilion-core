import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const SITE_URL =
"https://scaling-invention-5g7q4p5rwrwj3vwq7-3000.app.github.dev";

function getSafeNextPath(next: string | null) {
if (!next) return "/dashboard";
if (!next.startsWith("/")) return "/dashboard";
if (next.startsWith("//")) return "/dashboard";

return next;
}

export async function GET(request: Request) {
const requestUrl = new URL(request.url);
const code = requestUrl.searchParams.get("code");
const next = getSafeNextPath(requestUrl.searchParams.get("next"));

if (!code) {
return NextResponse.redirect(`${SITE_URL}/login?error=missing_auth_code`);
}

const supabase = await createClient();

const { error } = await supabase.auth.exchangeCodeForSession(code);

if (error) {
return NextResponse.redirect(
`${SITE_URL}/login?error=${encodeURIComponent(error.message)}`
);
}

return NextResponse.redirect(`${SITE_URL}${next}`);
}