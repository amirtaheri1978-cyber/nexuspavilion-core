import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    absolute: "Set Password | NexusPavilion Intelligent Procurement",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function SetPasswordLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
