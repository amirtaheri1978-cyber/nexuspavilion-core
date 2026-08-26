import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import AppShell from "@/components/app-shell";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = "https://nexuspavilion.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "NexusPavilion",
    template: "%s | NexusPavilion",
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

  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
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
