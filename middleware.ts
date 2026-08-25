import { NextResponse, type NextRequest } from "next/server";

import { isInternalNextPath } from "@/lib/auth/login-continuation";

const protectedRoutes = [
"/dashboard",
"/analytics",
"/vendor-dashboard",
"/notifications",
];

const COMPANY_SETUP_ROUTE = "/create-company";

function isCompanySetupRoute(pathname: string) {
return (
pathname === COMPANY_SETUP_ROUTE ||
pathname.startsWith(`${COMPANY_SETUP_ROUTE}/`)
);
}

function hasSupabaseSessionCookie(request: NextRequest) {
return Boolean(
request.cookies.get("sb-access-token") ||
request.cookies
.getAll()
.some((cookie) => cookie.name.startsWith("sb-"))
);
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
],
};
