import { NextResponse } from "next/server";

import type { WorkspaceRole } from "@/lib/auth/membership";
import {
  updateWorkspaceMemberRole,
  WorkspaceCommandError,
} from "@/lib/workspace/commands";
import { createClient } from "@/lib/supabase/server";

type EditableWorkspaceRole = Exclude<
  WorkspaceRole,
  "owner"
>;

type RequestBody = {
  memberId?: unknown;
  workspaceRole?: unknown;
};

function normalizeWorkspaceRole(
  value: unknown,
): EditableWorkspaceRole | null {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();

  if (normalizedValue === "admin") {
    return "admin";
  }

  if (normalizedValue === "member") {
    return "member";
  }

  if (normalizedValue === "viewer") {
    return "viewer";
  }

  return null;
}

function getCommandErrorResponse(
  error: WorkspaceCommandError,
) {
  switch (error.code) {
    case "UNAUTHENTICATED":
      return NextResponse.json(
        { error: error.message },
        { status: 401 },
      );

    case "FORBIDDEN":
    case "OWNER_PROTECTED":
    case "LAST_OWNER_PROTECTED":
      return NextResponse.json(
        { error: error.message },
        { status: 403 },
      );

    case "MEMBER_NOT_FOUND":
      return NextResponse.json(
        { error: error.message },
        { status: 404 },
      );

    case "SELF_MUTATION_NOT_ALLOWED":
    case "INVALID_ROLE":
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );

    default:
      return NextResponse.json(
        {
          error:
            "Unable to update the workspace member role.",
        },
        { status: 500 },
      );
  }
}

export async function POST(request: Request) {
  try {
    let body: RequestBody;

    try {
      body =
        (await request.json()) as RequestBody;
    } catch {
      return NextResponse.json(
        {
          error:
            "A valid request body is required.",
        },
        { status: 400 },
      );
    }

    const memberId = String(
      body.memberId || "",
    ).trim();

    const workspaceRole =
      normalizeWorkspaceRole(
        body.workspaceRole,
      );

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required." },
        { status: 400 },
      );
    }

    if (!workspaceRole) {
      return NextResponse.json(
        {
          error:
            "Workspace role must be admin, member, or viewer.",
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    await updateWorkspaceMemberRole(
      supabase,
      {
        targetUserId: memberId,
        workspaceRole,
      },
    );

    return NextResponse.json({
      success: true,
      workspaceRole,
    });
  } catch (error) {
    if (error instanceof WorkspaceCommandError) {
      return getCommandErrorResponse(error);
    }

    console.error(
      "Unexpected workspace role update failure.",
      error,
    );

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}