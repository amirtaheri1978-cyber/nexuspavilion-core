import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
const response = NextResponse.next();

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

const protectedRoutes = [
"/dashboard",
"/connections",
"/rfq",
"/verify",
];

const isProtectedRoute = protectedRoutes.some((route) =>
request.nextUrl.pathname.startsWith(route)
);

if (isProtectedRoute && !user) {
return NextResponse.redirect(new URL("/login", request.url));
}

if (request.nextUrl.pathname === "/login" && user) {
return NextResponse.redirect(new URL("/dashboard", request.url));
}

return response;
}

export const config = {
matcher: [
"/dashboard/:path*",
"/connections/:path*",
"/rfq/:path*",
"/verify/:path*",
"/login",
],
};