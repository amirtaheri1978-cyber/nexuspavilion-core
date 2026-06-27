"use client";

import { usePathname } from "next/navigation";

import AppTopbar from "@/components/common/AppTopbar";
import Footer from "@/components/footer";
import Sidebar from "@/components/sidebar";

const SIDEBAR_HIDDEN_ROUTES = [
"/create-company",
"/login",
"/register",
"/signup",
"/forgot-password",
"/set-password",
];

function shouldHideSidebar(pathname: string) {
return SIDEBAR_HIDDEN_ROUTES.some(
(route) => pathname === route || pathname.startsWith(`${route}/`)
);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
const pathname = usePathname();
const hideSidebar = shouldHideSidebar(pathname);

return (
<div className="min-h-screen bg-[#07111F] text-white">
{hideSidebar ? null : <Sidebar />}

<div
className={[
"min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(44,196,232,0.08),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(200,166,70,0.055),transparent_38%),#07111F]",
hideSidebar ? "" : "lg:ml-[330px]",
].join(" ")}
>
{hideSidebar ? null : <AppTopbar />}

<main className="min-h-[calc(100vh-76px)]">{children}</main>

<Footer />
</div>
</div>
);
}