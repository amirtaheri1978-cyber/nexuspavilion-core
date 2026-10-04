import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSafeNextPath, isInternalNextPath } from "@/lib/auth/login-continuation";
import { getCurrentWorkspaceContext, WorkspaceContextError } from "@/lib/auth/workspace-context";

const protectedRoutes = [
"/dashboard",
"/analytics",
"/vendor-dashboard",
"/notifications",
];

const COMPANY_SETUP_ROUTE = "/create-company";
const RFQ_WORKSPACE_FALLBACK = "/rfq";

function isCompanySetupRoute(pathname: string) {
return (
pathname === COMPANY_SETUP_ROUTE ||
pathname.startsWith(`${COMPANY_SETUP_ROUTE}/`)
);
}

function isRfqTreePath(pathname: string) {
return pathname === "/rfq" || pathname.startsWith("/rfq/");
}

function isRfqInvitePublicPath(pathname: string) {
return pathname === "/rfq/invite" || pathname.startsWith("/rfq/invite/");
}

function isRfqSubmitPageOwnedPath(pathname: string) {
return /^\/rfq\/[^/]+\/submit\/?$/.test(pathname);
}

function isRfqWorkspaceProtectedPath(pathname: string) {
if (!isRfqTreePath(pathname)) {
return false;
}

if (isRfqInvitePublicPath(pathname)) {
return false;
}

if (isRfqSubmitPageOwnedPath(pathname)) {
return false;
}

return true;
}

function hasSupabaseSessionCookie(request: NextRequest) {
return Boolean(
request.cookies.get("sb-access-token") ||
request.cookies
.getAll()
.some((cookie) => cookie.name.startsWith("sb-"))
);
}

function redirectToLoginWithNext(request: NextRequest, destination: string) {
const loginUrl = new URL("/login", request.url);
loginUrl.searchParams.set(
"next",
isInternalNextPath(destination) ? destination : RFQ_WORKSPACE_FALLBACK
);
return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
const { pathname } = request.nextUrl;

if (isCompanySetupRoute(pathname) && !hasSupabaseSessionCookie(request)) {
const loginUrl = new URL("/login", request.url);
const setupDestination = `${pathname}${request.nextUrl.search}`;
loginUrl.searchParams.set(
"next",
isInternalNextPath(setupDestination)
? setupDestination
: COMPANY_SETUP_ROUTE
);
return NextResponse.redirect(loginUrl);
}

if (isCompanySetupRoute(pathname)) {
let response = NextResponse.next({ request });
const authHeaders = new Headers();
const supabase = createServerClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
{
cookies: {
getAll: () => request.cookies.getAll(),
setAll: (cookiesToSet, headers) => {
for (const { name, value } of cookiesToSet) {
request.cookies.set(name, value);
}
const previousCookies = response.cookies.getAll();
response = NextResponse.next({ request });
for (const cookie of previousCookies) {
response.cookies.set(cookie);
}
for (const { name, value, options } of cookiesToSet) {
response.cookies.set(name, value, options);
}
for (const [name, value] of Object.entries(headers)) {
authHeaders.set(name, value);
}
authHeaders.forEach((value, name) => response.headers.set(name, value));
},
},
}
);
let companyId: string | null = null;
try {
companyId = (await getCurrentWorkspaceContext(supabase)).companyId;
} catch (error) {
/*
 * Onboarding must remain reachable when an authenticated user does not yet
 * have a resolvable company workspace. Profile/membership lookup failures
 * are treated as "no company confirmed" rather than crashing the route.
 */
const code =
error instanceof WorkspaceContextError
? error.code
: error &&
typeof error === "object" &&
"name" in error &&
(error as { name?: unknown }).name === "WorkspaceContextError" &&
"code" in error &&
typeof (error as { code?: unknown }).code === "string"
? (error as { code: string }).code
: null;

const recoverableCodes = [
"UNAUTHENTICATED",
"AUTH_LOOKUP_FAILED",
"PROFILE_NOT_FOUND",
"PROFILE_LOOKUP_FAILED",
"MEMBERSHIP_LOOKUP_FAILED",
];

if (!code || !recoverableCodes.includes(code)) {
throw error;
}
}
if (companyId) {
const destination = new URL(getSafeNextPath(request.nextUrl.searchParams.get("next")), request.url);
if (destination.origin !== request.nextUrl.origin || isCompanySetupRoute(destination.pathname)) {
destination.href = new URL("/dashboard", request.url).href;
}
const redirect = NextResponse.redirect(destination);
for (const cookie of response.cookies.getAll()) {
redirect.cookies.set(cookie);
}
authHeaders.forEach((value, name) => redirect.headers.set(name, value));
return redirect;
}

const {
data: pendingInvitation,
error: pendingInvitationError,
} = await supabase.rpc("get_current_user_pending_workspace_invitation");

const pendingInvitationToken =
!pendingInvitationError &&
pendingInvitation &&
typeof pendingInvitation === "object" &&
!Array.isArray(pendingInvitation) &&
"token" in pendingInvitation &&
typeof pendingInvitation.token === "string"
? pendingInvitation.token.trim()
: "";

if (pendingInvitationToken) {
const redirect = NextResponse.redirect(
new URL(`/invite/${encodeURIComponent(pendingInvitationToken)}`, request.url)
);
for (const cookie of response.cookies.getAll()) {
redirect.cookies.set(cookie);
}
authHeaders.forEach((value, name) => redirect.headers.set(name, value));
return redirect;
}

return response;
}

if (
isRfqWorkspaceProtectedPath(pathname) &&
!hasSupabaseSessionCookie(request)
) {
const destination = `${pathname}${request.nextUrl.search}`;
return redirectToLoginWithNext(request, destination);
}

const isProtectedRoute = protectedRoutes.some((route) =>
pathname.startsWith(route)
);

if (!isProtectedRoute) {
return NextResponse.next();
}

if (!hasSupabaseSessionCookie(request)) {
const loginUrl = new URL("/login", request.url);
return NextResponse.redirect(loginUrl);
}

return NextResponse.next();
}

export const config = {
matcher: [
"/dashboard/:path*",
"/analytics/:path*",
"/vendor-dashboard/:path*",
"/notifications/:path*",
"/create-company",
"/create-company/:path*",
"/rfq",
"/rfq/:path*",
],
};
