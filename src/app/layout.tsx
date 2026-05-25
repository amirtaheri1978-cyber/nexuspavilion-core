import type { Metadata } from "next";
import { Inter } from "next/font/google";

import Sidebar from "@/components/sidebar";

import "./globals.css";

const inter = Inter({
subsets: ["latin"],
});

export const metadata: Metadata = {
title: "Nexus Pavilion",
description: "Enterprise procurement and construction platform",
};

export default function RootLayout({
children,
}: Readonly<{
children: React.ReactNode;
}>) {
return (
<html lang="en">
<body className={`${inter.className} bg-slate-100`}>
<Sidebar />

<div className="lg:ml-72">
{children}
</div>
</body>
</html>
);
}