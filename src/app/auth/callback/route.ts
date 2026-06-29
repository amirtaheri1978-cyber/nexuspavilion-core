import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const SITE_URL =
process.env.NEXT_PUBLIC_SITE_URL ||
"https://scaling-invention-5g7q4p5rwrwj3vwq7-3000.app.github.dev";

function getSafeNextPath(next: string | null) {
if (!next) return "/dashboard";
if (!next.startsWith("/")) return "/dashboard";
if (next.startsWith("//")) return "/dashboard";

return next;
}

function getSafeAuthMessage(errorCode: string) {
if (errorCode === "missing_auth_code") {
return "This secure authentication link is incomplete. Please request a new link or sign in again.";
}

if (errorCode === "expired_or_invalid_link") {
return "This secure authentication link has expired or is no longer valid. Please request a new link.";
}

return "We could not complete your secure sign-in. Please try again.";
}

function buildLoginRedirect(errorCode: string) {
const url = new URL("/login", SITE_URL);
url.searchParams.set("message", getSafeAuthMessage(errorCode));
url.searchParams.set("authStatus", "attention");

return NextResponse.redirect(url);
}

export async function GET(request: Request) {
const requestUrl = new URL(request.url);
const code = requestUrl.searchParams.get("code");
const next = getSafeNextPath(requestUrl.searchParams.get("next"));

if (!code) {
return buildLoginRedirect("missing_auth_code");
}

const supabase = await createClient();

const { error } = await supabase.auth.exchangeCodeForSession(code);

if (error) {
return buildLoginRedirect("expired_or_invalid_link");
}

return NextResponse.redirect(new URL(next, SITE_URL));
}
