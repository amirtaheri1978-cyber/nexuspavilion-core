import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    absolute: "RFQ Invitation | Intelligent Procurement",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RfqInviteLayout({ children }: { children: ReactNode }) {
  return children;
}
