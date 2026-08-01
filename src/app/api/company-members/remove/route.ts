import { NextResponse } from "next/server";

import {
  removeWorkspaceMember,
  WorkspaceCommandError,
} from "@/lib/workspace/commands";
import { createClient } from "@/lib/supabase/server";

type RequestBody = {
  memberId?: unknown;
};

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
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );

    default:
      return NextResponse.json(
        {
          error:
            "Unable to remove the workspace member.",
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

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    await removeWorkspaceMember(
      supabase,
      {
        targetUserId: memberId,
      },
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    if (error instanceof WorkspaceCommandError) {
      return getCommandErrorResponse(error);
    }

    console.error(
      "Unexpected workspace member removal failure.",
      error,
    );

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}