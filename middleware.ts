import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = [
"/dashboard",
"/analytics",
"/vendor-dashboard",
"/notifications",
];

export function middleware(request: NextRequest) {
const { pathname } = request.nextUrl;

const isProtectedRoute = protectedRoutes.some((route) =>
pathname.startsWith(route)
);

if (!isProtectedRoute) {
return NextResponse.next();
}

const hasSupabaseSession =
request.cookies.get("sb-access-token") ||
request.cookies
.getAll()
.some((cookie) => cookie.name.startsWith("sb-"));

if (!hasSupabaseSession) {
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
],
};