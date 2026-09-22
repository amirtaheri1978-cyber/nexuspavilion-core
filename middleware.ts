import { NextResponse, type NextRequest } from "next/server";

import { isInternalNextPath } from "@/lib/auth/login-continuation";

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

export function middleware(request: NextRequest) {
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
