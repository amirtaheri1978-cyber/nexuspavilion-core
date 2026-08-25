import { NextResponse } from "next/server";

import {
  getSafeNextPath,
  isInternalNextPath,
} from "@/lib/auth/login-continuation";
import { syncCurrentUserProfessionalNames } from "@/lib/auth/professional-names";
import { resolveRequestSiteUrl } from "@/lib/ops/public-site-url";
import { createClient } from "@/lib/supabase/server";

function getSafeAuthMessage(errorCode: string) {
if (errorCode === "missing_auth_code") {
return "This secure authentication link is incomplete. Please request a new link or sign in again.";
}

if (errorCode === "expired_or_invalid_link") {
return "This secure authentication link has expired or is no longer valid. Please request a new link.";
}

return "We could not complete your secure sign-in. Please try again.";
}

function buildLoginRedirect(
errorCode: string,
SITE_URL: string,
next?: string | null,
) {
const url = new URL("/login", SITE_URL);
url.searchParams.set("message", getSafeAuthMessage(errorCode));
url.searchParams.set("authStatus", "attention");

if (isInternalNextPath(next)) {
url.searchParams.set("next", next);
}

return NextResponse.redirect(url);
}

export async function GET(request: Request) {
const requestUrl = new URL(request.url);
const SITE_URL = resolveRequestSiteUrl(request.url);
const code = requestUrl.searchParams.get("code");
const requestedNext = requestUrl.searchParams.get("next");
const next = getSafeNextPath(requestedNext);

if (!code) {
return buildLoginRedirect("missing_auth_code", SITE_URL, requestedNext);
}

const supabase = await createClient();

const { error } = await supabase.auth.exchangeCodeForSession(code);

if (error) {
return buildLoginRedirect("expired_or_invalid_link", SITE_URL, requestedNext);
}

try {
await syncCurrentUserProfessionalNames(supabase, {
requireNames: false,
});
} catch {
// Names are optional for existing users. Never block callback continuation.
}

return NextResponse.redirect(new URL(next, SITE_URL));
}
