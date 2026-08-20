import { notFound } from "next/navigation";

import { InviteEnrollmentVisualQaFixture } from "@/components/executive/invitation/invite-enrollment-visual-qa-fixture";

export default function InviteEnrollmentVisualQaPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <InviteEnrollmentVisualQaFixture />;
}
