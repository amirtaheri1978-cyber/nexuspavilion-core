import { redirect } from "next/navigation";

import { ProjectPortfolioList } from "@/components/projects/project-portfolio-list";
import { ProjectSystemState } from "@/components/projects/project-system-state";
import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
} from "@/lib/auth/workspace-context";
import { canManageWorkspace } from "@/lib/auth/membership";
import { getSafeNextPath } from "@/lib/auth/login-continuation";
import { EXECUTIVE_PAGE_CLASS } from "@/lib/design-system/executive-contract";
import {
  loadCompanyProjects,
  ProjectRepositoryError,
} from "@/lib/projects/project-repository";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  const supabase = await createClient();

  let context;

  try {
    context = await getCurrentWorkspaceContext(supabase);
  } catch (error) {
    if (
      error instanceof WorkspaceContextError &&
      error.code === "UNAUTHENTICATED"
    ) {
      redirect(`/login?next=${encodeURIComponent(getSafeNextPath("/projects"))}`);
    }

    return (
      <ProjectSystemState
        eyebrow="Project Portfolio"
        title="Project workspace context is unavailable."
        description="NexusPavilion could not verify the company workspace required to load Project records. No Project data was exposed."
        primaryHref="/dashboard"
        primaryLabel="Executive Overview"
        secondaryHref="/company/settings"
        secondaryLabel="Workspace Settings"
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
        description="Project records are company-scoped. Your current session does not have an active exact-company membership, so no Project data was loaded."
        primaryHref="/dashboard"
        primaryLabel="Executive Overview"
        secondaryHref="/company/settings"
        secondaryLabel="Workspace Settings"
      />
    );
  }

  let projects;

  try {
    projects = await loadCompanyProjects(
      supabase,
      context.membership.companyId,
    );
  } catch (error) {
    console.error("Project Portfolio load failed.", {
      userId: context.userId,
      companyId: context.membership.companyId,
      error:
        error instanceof ProjectRepositoryError
          ? error.cause
          : error,
    });

    return (
      <ProjectSystemState
        eyebrow="Project Portfolio"
        title="Project Portfolio is temporarily unavailable."
        description="The company Project records or their verified procurement associations could not be loaded. No cross-company or inferred fallback was used."
        primaryHref="/dashboard"
        primaryLabel="Executive Overview"
        secondaryHref="/company/settings"
        secondaryLabel="Workspace Settings"
      />
    );
  }

  return (
    <main className={EXECUTIVE_PAGE_CLASS}>
      <section className="rounded-[34px] border border-white/10 bg-white/[0.045] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.34)] sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
          Company Operations
        </p>

        <h1 className="mt-4 max-w-5xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
          Project Portfolio
        </h1>

        <p className="mt-5 max-w-4xl text-sm font-semibold leading-7 text-slate-300 sm:text-base">
          Maintain first-class company Project records while surfacing only
          verified company-scoped RFQ and contract-award context. Project
          identity remains independent from procurement events.
        </p>
      </section>

      <ProjectPortfolioList
        projects={projects}
        canCreateProject={canManageWorkspace(context.membership)}
      />
    </main>
  );
}
