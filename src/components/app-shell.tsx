"use client";

import { usePathname } from "next/navigation";

import AppTopbar from "@/components/common/AppTopbar";
import Footer from "@/components/footer";
import Sidebar from "@/components/sidebar";

const APP_SHELL_HIDDEN_ROUTES = [
"/",
"/about",
"/contact",
"/pricing",
"/privacy",
"/terms",
"/create-company",
"/login",
"/register",
"/signup",
"/forgot-password",
"/set-password",
];

function shouldHideAppShell(pathname: string) {
return APP_SHELL_HIDDEN_ROUTES.some(
(route) => pathname === route || pathname.startsWith(`${route}/`)
);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
const pathname = usePathname();
const hideAppShell = shouldHideAppShell(pathname);

if (hideAppShell) {
return (
<div className="min-h-screen bg-[#07111F] text-white">
{children}
<Footer />
</div>
);
}

return (
<div className="min-h-screen bg-[#07111F] text-white">
<Sidebar />

<div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(44,196,232,0.08),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(200,166,70,0.055),transparent_38%),#07111F] lg:ml-[330px]">
<AppTopbar />

<main className="min-h-[calc(100vh-76px)]">{children}</main>

<Footer />
</div>
</div>
);
}