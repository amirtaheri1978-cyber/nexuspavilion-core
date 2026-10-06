import type { Metadata } from "next";
import { Instrument_Sans, Manrope } from "next/font/google";
import type { ReactNode } from "react";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-corporate-display",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-corporate-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    absolute: "Sign In | Intelligent Procurement",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${instrumentSans.variable} ${manrope.variable}`}
      style={{
        fontFamily:
          "var(--font-corporate-body), system-ui, sans-serif",
      }}
    >
      {children}
    </div>
  );
}
