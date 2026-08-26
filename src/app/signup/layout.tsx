import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    absolute: "Create Account | NexusPavilion Intelligent Procurement",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignupLayout({ children }: { children: ReactNode }) {
  return children;
}
