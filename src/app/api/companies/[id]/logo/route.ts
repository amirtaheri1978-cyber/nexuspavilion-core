import { NextResponse } from "next/server";

import {
  canManageCompany,
  type UserRole,
} from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeLogoUrl(value: unknown) {
  return String(value || "").trim();
}

function isAllowedLogoUrl(value: string) {
  if (!value || value.length > 2048) {
    return false;
  }

  try {
    const url = new URL(value);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (url.protocol !== "https:" || !supabaseUrl) {
      return false;
    }

    const allowedOrigin = new URL(supabaseUrl).origin;

    return (
      url.origin === allowedOrigin &&
      url.pathname.includes(
        "/storage/v1/object/public/Company-logos/",
      )
    );
  } catch {
    return false;
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    let body: { logoUrl?: unknown };

    try {
      body = (await request.json()) as {
        logoUrl?: unknown;
      };
    } catch {
      return NextResponse.json(
        { error: "A valid request body is required." },
        { status: 400 },
      );
    }

    const logoUrl = normalizeLogoUrl(body.logoUrl);

    if (!isAllowedLogoUrl(logoUrl)) {
      return NextResponse.json(
        {
          error:
            "A valid Nexus Pavilion company logo URL is required.",
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("id, email, role, company_id")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile?.company_id) {
      return NextResponse.json(
        { error: "An active company profile is required." },
        { status: 403 },
      );
    }

    if (!canManageCompany(profile.role as UserRole)) {
      return NextResponse.json(
        {
          error:
            "Only organization owners and administrators can update company branding.",
        },
        { status: 403 },
      );
    }

    if (profile.company_id !== id) {
      return NextResponse.json(
        {
          error:
            "You can only update branding for your own organization.",
        },
        { status: 403 },
      );
    }

    const { data: company, error: companyError } =
      await supabase
        .from("companies")
        .select("id, name, logo_url")
        .eq("id", id)
        .maybeSingle();

    if (companyError) {
      console.error("Company logo lookup failed.", {
        companyId: id,
        userId: user.id,
        error: companyError,
      });

      return NextResponse.json(
        { error: "We could not verify the organization." },
        { status: 500 },
      );
    }

    if (!company) {
      return NextResponse.json(
        { error: "Company not found." },
        { status: 404 },
      );
    }

    const { data: updatedCompany, error: updateError } =
      await supabase
        .from("companies")
        .update({
          logo_url: logoUrl,
        })
        .eq("id", id)
        .select("id, name, logo_url")
        .maybeSingle();

    if (updateError || !updatedCompany) {
      console.error("Company logo update failed.", {
        companyId: id,
        userId: user.id,
        error: updateError,
      });

      return NextResponse.json(
        { error: "Failed to update the company logo." },
        { status: 500 },
      );
    }

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        action: "COMPANY_LOGO_UPDATED",
        entity_type: "company",
        entity_id: id,
        user_id: user.id,
        company_id: id,
        metadata: {
          previous_logo_url: company.logo_url,
          new_logo_url: logoUrl,
          actor_role: profile.role,
          updated_at: new Date().toISOString(),
        },
      });

    if (auditError) {
      console.error("Company logo audit failed.", {
        companyId: id,
        userId: user.id,
        error: auditError,
      });
    }

    return NextResponse.json({
      success: true,
      company: updatedCompany,
    });
  } catch (error) {
    console.error("Unexpected company logo failure.", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}