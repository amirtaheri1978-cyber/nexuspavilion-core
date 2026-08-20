import { notFound } from "next/navigation";

import { IdentitySurfacesVisualQaFixture } from "@/components/identity-surfaces-visual-qa-fixture";

export default function IdentitySurfacesVisualQaPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <IdentitySurfacesVisualQaFixture />;
}
