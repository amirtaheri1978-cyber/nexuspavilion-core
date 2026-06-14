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
<>
{hideSidebar ? null : <Sidebar />}

<div className={`min-h-screen ${hideSidebar ? "" : "lg:ml-96"}`}>
{children}
<Footer />
</div>
</>
);
}