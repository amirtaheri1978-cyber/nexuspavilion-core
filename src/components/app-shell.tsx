"use client";

import { usePathname } from "next/navigation";

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
<div className="min-h-screen bg-[#07111F]">
{hideSidebar ? null : <Sidebar />}

<div
className={`min-h-screen bg-[#07111F] ${
hideSidebar ? "" : "lg:ml-[330px]"
}`}
>
{children}
<Footer />
</div>
</div>
);
}