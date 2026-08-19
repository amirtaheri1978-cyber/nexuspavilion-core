import { notFound } from "next/navigation";

import CreateCompanyPage from "@/app/create-company/page";

export default function FounderOnboardingVisualQaPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <CreateCompanyPage />;
}
