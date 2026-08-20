import { notFound } from "next/navigation";

import { CompanySettingsIdentityVisualQaFixture } from "@/components/company-settings-identity-visual-qa-fixture";

export default function CompanySettingsIdentityVisualQaPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <CompanySettingsIdentityVisualQaFixture />;
}
