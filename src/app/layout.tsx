import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import AppShell from "@/components/app-shell";

import "./globals.css";

const inter = Inter({
subsets: ["latin"],
display: "swap",
});

export const metadata: Metadata = {
metadataBase: new URL("https://nexuspavilion.com"),

applicationName: "Nexus Pavilion",

title: {
default: "Nexus Pavilion",
template: "%s | Nexus Pavilion",
},

description:
"AI-powered procurement intelligence platform connecting buyers, suppliers, RFQs, vendor intelligence, and executive procurement analytics.",

keywords: [
"procurement",
"RFQ",
"supplier management",
"vendor intelligence",
"sourcing",
"construction procurement",
"procurement analytics",
"supplier network",
"AI procurement",
"enterprise procurement",
],

authors: [{ name: "Nexus Pavilion" }],
creator: "Nexus Pavilion",
publisher: "Nexus Pavilion",

category: "Procurement Software",

alternates: {
canonical: "/",
},

openGraph: {
title: "Nexus Pavilion",
description: "Enterprise procurement intelligence platform powered by AI.",
url: "https://nexuspavilion.com",
siteName: "Nexus Pavilion",
type: "website",
locale: "en_US",
},

twitter: {
card: "summary_large_image",
title: "Nexus Pavilion",
description: "Enterprise procurement intelligence platform powered by AI.",
},

robots: {
index: true,
follow: true,
googleBot: {
index: true,
follow: true,
"max-image-preview": "large",
"max-snippet": -1,
"max-video-preview": -1,
},
},
};

export const viewport: Viewport = {
width: "device-width",
initialScale: 1,
themeColor: "#07111F",
};

export default function RootLayout({
children,
}: Readonly<{
children: React.ReactNode;
}>) {
return (
<html lang="en">
<body className={`${inter.className} bg-[#07111F] antialiased`}>
<AppShell>{children}</AppShell>
</body>
</html>
);
}