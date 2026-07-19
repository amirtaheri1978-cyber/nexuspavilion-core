import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import AppShell from "@/components/app-shell";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = "https://nexuspavilion.com";
const brandDescription =
  "Executive-grade construction procurement intelligence platform for RFQs, supplier governance, board reporting, award confidence, and enterprise decision control.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  applicationName: "Nexus Pavilion",

  title: {
    default: "Nexus Pavilion | Procurement Intelligence Platform",
    template: "%s | Nexus Pavilion",
  },

  description: brandDescription,

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
    "board reporting",
    "supplier governance",
    "award confidence",
    "procurement intelligence",
  ],

  authors: [{ name: "Nexus Pavilion" }],
  creator: "Nexus Pavilion",
  publisher: "Nexus Pavilion",

  category: "Procurement Software",

  alternates: {
    canonical: "/",
  },

  icons: {
    icon: [
      { url: "/branding/favicon.ico" },
      {
        url: "/branding/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/branding/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/branding/favicon-48x48.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        url: "/branding/favicon-64x64.png",
        sizes: "64x64",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/branding/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: [{ url: "/branding/favicon.ico" }],
  },

  manifest: "/branding/manifest.json",

  openGraph: {
    title: "Nexus Pavilion | Procurement Intelligence Platform",
    description: brandDescription,
    url: siteUrl,
    siteName: "Nexus Pavilion",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/branding/og-image.png",
        width: 1200,
        height: 630,
        alt: "Nexus Pavilion procurement intelligence platform",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Nexus Pavilion | Procurement Intelligence Platform",
    description: brandDescription,
    images: ["/branding/twitter-card.png"],
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

  appleWebApp: {
    capable: true,
    title: "Nexus Pavilion",
    statusBarStyle: "black-translucent",
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