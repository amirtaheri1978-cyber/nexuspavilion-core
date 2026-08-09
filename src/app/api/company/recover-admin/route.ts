import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Emergency ownership recovery is unavailable until a canonical membership-based recovery workflow is approved.",
    },
    { status: 410 },
  );
}
