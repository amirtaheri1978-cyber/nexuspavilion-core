import type { Metadata } from "next";
import { Inter } from "next/font/google";

import Sidebar from "@/components/sidebar";

import "./globals.css";

const inter = Inter({
subsets: ["latin"],
});

export const metadata: Metadata = {
metadataBase: new URL("https://nexuspavilion.com"),

title: {
default: "Nexus Pavilion",
template: "%s | Nexus Pavilion",
},

description:
"Enterprise procurement platform connecting buyers, vendors, RFQs, construction procurement workflows, supplier management, and contract awards.",

keywords: [
"procurement",
"construction procurement",
"RFQ",
"vendor management",
"supplier management",
"construction platform",
"bidding",
"contract awards",
"enterprise procurement",
],

openGraph: {
title: "Nexus Pavilion",
description: "Enterprise procurement and construction platform.",
type: "website",
siteName: "Nexus Pavilion",
},

twitter: {
card: "summary_large_image",
title: "Nexus Pavilion",
description: "Enterprise procurement and construction platform.",
},

robots: {
index: true,
follow: true,
},
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

<div className="lg:ml-72">{children}</div>
</body>
</html>
);
}