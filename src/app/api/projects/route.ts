import { NextResponse } from "next/server";

import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
} from "@/lib/auth/workspace-context";
import { canManageWorkspace } from "@/lib/auth/membership";
import { parseProjectCreateInput } from "@/lib/projects/project-contract";
import {
  createCompanyProject,
  ProjectCodeConflictError,
  ProjectRepositoryError,
} from "@/lib/projects/project-repository";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    let context;

    try {
      context = await getCurrentWorkspaceContext(supabase);
    } catch (error) {
      if (
        error instanceof WorkspaceContextError &&
        error.code === "UNAUTHENTICATED"
      ) {
        return NextResponse.json(
          { error: "Authentication is required." },
          { status: 401 },
        );
      }

      console.error("Project create workspace context failed.", error);

      return NextResponse.json(
        { error: "Unable to verify the company workspace." },
        { status: 500 },
      );
    }

    if (
      !context.companyId ||
      !context.membership ||
      context.membership.membershipStatus !== "active" ||
      context.membership.companyId !== context.companyId
    ) {
      return NextResponse.json(
        { error: "An active company membership is required." },
        { status: 403 },
      );
    }

    if (!canManageWorkspace(context.membership)) {
      return NextResponse.json(
        {
          error:
            "Only workspace owners and administrators can create Projects.",
        },
        { status: 403 },
      );
    }

    const parsed = parseProjectCreateInput(await request.json());

    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 },
      );
    }

    try {
      const project = await createCompanyProject(supabase, {
        companyId: context.membership.companyId,
        createdBy: context.userId,
        project: parsed.value,
      });

      return NextResponse.json(
        {
          success: true,
          project,
        },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof ProjectCodeConflictError) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 },
        );
      }

      console.error("Project create repository failed.", {
        userId: context.userId,
        companyId: context.membership.companyId,
        error:
          error instanceof ProjectRepositoryError
            ? error.cause
            : error,
      });

      return NextResponse.json(
        { error: "Unable to create the Project record." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Project create route failed.", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
