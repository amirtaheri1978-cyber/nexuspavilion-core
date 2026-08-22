import { NextResponse } from "next/server";

/**
 * Public liveness probe. Intentionally does not ping Supabase, list
 * environment keys, or report secret/configuration presence.
 */
export async function GET() {
  const commitSha =
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() ||
    null;

  return NextResponse.json({
    ok: true,
    service: "nexus-pavilion",
    commitSha,
  });
}
