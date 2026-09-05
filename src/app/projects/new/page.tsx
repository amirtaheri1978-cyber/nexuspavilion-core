import { redirect } from "next/navigation";

import { ProjectCreateForm } from "@/components/projects/project-create-form";
import { ProjectSystemState } from "@/components/projects/project-system-state";
import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
} from "@/lib/auth/workspace-context";
import { canManageWorkspace } from "@/lib/auth/membership";
import { getSafeNextPath } from "@/lib/auth/login-continuation";
import { EXECUTIVE_PAGE_CLASS } from "@/lib/design-system/executive-contract";
import { createClient } from "@/lib/supabase/server";

export default async function NewProjectPage() {
  const supabase = await createClient();

  let context;

  try {
    context = await getCurrentWorkspaceContext(supabase);
  } catch (error) {
    if (
      error instanceof WorkspaceContextError &&
      error.code === "UNAUTHENTICATED"
    ) {
      redirect(
        `/login?next=${encodeURIComponent(getSafeNextPath("/projects/new"))}`,
      );
    }

    return (
      <ProjectSystemState
        eyebrow="Project Portfolio"
        title="Project creation is unavailable."
        description="NexusPavilion could not verify the company workspace required to create a Project."
        primaryHref="/projects"
        primaryLabel="Project Portfolio"
        secondaryHref="/dashboard"
        secondaryLabel="Executive Overview"
      />
    );
  }

  if (!context.companyId) {
    redirect("/create-company");
  }

  if (
    !context.membership ||
    context.membership.membershipStatus !== "active" ||
    context.membership.companyId !== context.companyId
  ) {
    return (
      <ProjectSystemState
        eyebrow="Project Portfolio"
        title="Active company membership is required."
        description="Project creation is company-scoped and requires an active exact-company membership."
        primaryHref="/projects"
        primaryLabel="Project Portfolio"
        secondaryHref="/company/settings"
        secondaryLabel="Workspace Settings"
      />
    );
  }

  if (!canManageWorkspace(context.membership)) {
    return (
      <ProjectSystemState
        eyebrow="Project Portfolio"
        title="Project creation requires workspace management access."
        description="Only active workspace owners and administrators can create independent company Project records."
        primaryHref="/projects"
        primaryLabel="Project Portfolio"
        secondaryHref="/company/settings"
        secondaryLabel="Workspace Settings"
      />
    );
  }

  return (
    <main className={EXECUTIVE_PAGE_CLASS}>
      <section className="mb-8 rounded-[34px] border border-white/10 bg-white/[0.045] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.34)] sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
          Project Portfolio
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
          Create Project
        </h1>

        <p className="mt-5 max-w-3xl text-sm font-semibold leading-7 text-slate-300 sm:text-base">
          Create the company-level Project record independently from any RFQ.
          Procurement associations are intentionally outside the 9-01 scope.
        </p>
      </section>

      <ProjectCreateForm />
    </main>
  );
}
