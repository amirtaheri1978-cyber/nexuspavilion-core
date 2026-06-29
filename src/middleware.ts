import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const PROTECTED_ROUTES = [
"/dashboard",
"/connections",
"/rfq",
"/analytics",
"/company",
"/vendor-dashboard",
"/directory",
"/notifications",
];

const AUTH_ROUTES = ["/login", "/signup"];

const COMPANY_SETUP_ROUTE = "/create-company";

const COMPANY_SETUP_ALLOWED_ROUTES = [
"/create-company",
"/login",
"/signup",
"/set-password",
"/forgot-password",
"/verify",
"/rfq/invite",
];

function startsWithAny(pathname: string, routes: string[]) {
return routes.some(
(route) => pathname === route || pathname.startsWith(`${route}/`)
);
}

function redirectToLogin(request: NextRequest, message: string) {
const loginUrl = new URL("/login", request.url);
loginUrl.searchParams.set("authStatus", "attention");
loginUrl.searchParams.set("message", message);

return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
const response = NextResponse.next();

const pathname = request.nextUrl.pathname;

const isProtectedRoute = startsWithAny(pathname, PROTECTED_ROUTES);
const isAuthRoute = startsWithAny(pathname, AUTH_ROUTES);
const isCompanySetupRoute = startsWithAny(
pathname,
COMPANY_SETUP_ALLOWED_ROUTES
);

const supabase = createServerClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
{
cookies: {
get(name: string) {
return request.cookies.get(name)?.value;
},

set(name: string, value: string, options) {
response.cookies.set({
name,
value,
...options,
});
},

remove(name: string, options) {
response.cookies.set({
name,
value: "",
...options,
});
},
},
}
);

const {
data: { user },
} = await supabase.auth.getUser();

if (isProtectedRoute && !user) {
return redirectToLogin(
request,
"Your secure workspace session has expired. Please sign in again to continue."
);
}

if (isAuthRoute && user) {
const { data: profile } = await supabase
.from("profiles")
.select("company_id")
.eq("id", user.id)
.maybeSingle();

if (!profile?.company_id) {
return NextResponse.redirect(new URL(COMPANY_SETUP_ROUTE, request.url));
}

return NextResponse.redirect(new URL("/dashboard", request.url));
}

if (user && !isCompanySetupRoute) {
const { data: profile } = await supabase
.from("profiles")
.select("company_id")
.eq("id", user.id)
.maybeSingle();

if (!profile?.company_id && isProtectedRoute) {
return NextResponse.redirect(new URL(COMPANY_SETUP_ROUTE, request.url));
}
}

return response;
}

export const config = {
matcher: [
"/dashboard/:path*",
"/connections/:path*",
"/rfq/:path*",
"/analytics/:path*",
"/company/:path*",
"/vendor-dashboard/:path*",
"/directory/:path*",
"/notifications/:path*",
"/create-company/:path*",
"/login",
"/signup",
],
};