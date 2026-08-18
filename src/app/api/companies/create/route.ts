import { NextResponse } from "next/server";

import {
  WORKSPACE_ALREADY_CONNECTED_ERROR,
  WORKSPACE_BOOTSTRAP_INCOMPLETE_ERROR,
  WORKSPACE_CREATE_FAILED_ERROR,
  WORKSPACE_ELIGIBILITY_ERROR,
  WORKSPACE_RECOVERY_REQUIRED_ERROR,
  planOwnedCompanyResolution,
} from "@/lib/auth/workspace-bootstrap";
import { companyWelcomeEmail } from "@/lib/email/templates/company-welcome-email";
import { sendEmail } from "@/lib/email/send-email";
import { createClient } from "@/lib/supabase/server";

type AccountType =
  | "buyer_owner"
  | "vendor_supplier"
  | "consultant"
  | "service_provider";

type RequestBody = {
  name?: unknown;
  location?: unknown;
  accountType?: unknown;
  networkRole?: unknown;
};

const COMPANY_NAME_MIN_LENGTH = 2;
const COMPANY_NAME_MAX_LENGTH = 160;
const LOCATION_MIN_LENGTH = 2;
const LOCATION_MAX_LENGTH = 160;

const ACCOUNT_TYPE_CONFIG: Record<
  AccountType,
  {
    profileRole: "owner" | "vendor";
    defaultNetworkRole: string;
    allowedNetworkRoles: string[];
  }
> = {
  buyer_owner: {
    profileRole: "owner",
    defaultNetworkRole: "Project Owner",
    allowedNetworkRoles: [
      "Project Owner",
      "Owner / Developer",
      "General Contractor",
      "Construction Manager",
      "Procurement Team",
    ],
  },
  vendor_supplier: {
    profileRole: "vendor",
    defaultNetworkRole: "Building Products Supplier",
    allowedNetworkRoles: [
      "Building Products Supplier",
      "Building Materials Supplier",
      "Architectural Products Supplier",
      "Building Systems Supplier",
      "Construction Product Distributor",
      "Construction Equipment Supplier",
      "Supplier",
      "Material Supplier",
    ],
  },
  consultant: {
    profileRole: "vendor",
    defaultNetworkRole: "Professional Consultant",
    allowedNetworkRoles: [
      "Professional Consultant",
      "Consultant",
      "Architecture & Design Firm",
      "Structural Engineering Firm",
      "Civil Engineering Firm",
      "MEP Engineering Firm",
      "Geotechnical Engineering Firm",
      "Environmental Consulting Firm",
      "Cost Management & Quantity Surveying Firm",
      "Project & Construction Management Firm",
    ],
  },
  service_provider: {
    profileRole: "vendor",
    defaultNetworkRole: "Construction Service Provider",
    allowedNetworkRoles: [
      "Construction Service Provider",
      "Service Provider",
      "Specialty Trade Contractor",
      "Building Envelope Contractor",
      "Interior Fit-Out Contractor",
      "Mechanical Contractor",
      "Electrical Contractor",
      "Fire Protection Contractor",
      "Commissioning & Start-up Provider",
      "Testing & Inspection Firm",
      "Construction Logistics Provider",
      "Facility Maintenance Contractor",
    ],
  },
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function createSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function isAccountType(value: string): value is AccountType {
  return (
    value === "buyer_owner" ||
    value === "vendor_supplier" ||
    value === "consultant" ||
    value === "service_provider"
  );
}

function normalizeNetworkRole(
  accountType: AccountType,
  value: string,
) {
  const normalizedValue = normalizeText(value);
  const accountConfig = ACCOUNT_TYPE_CONFIG[accountType];

  if (!normalizedValue) {
    return accountConfig.defaultNetworkRole;
  }

  const aliases: Record<string, string> = {
    "Supplier / Vendor": "Building Products Supplier",
    "Vendor / Supplier": "Building Products Supplier",
    Manufacturer: "Building Products Supplier",
    Distributor: "Construction Product Distributor",
    "Distributor / Supplier": "Construction Product Distributor",
    "Material Supplier": "Building Materials Supplier",
    Supplier: "Building Products Supplier",

    Consultant: "Professional Consultant",
    "Professional Services Consultant": "Professional Consultant",
    "Consultant / Service Provider": "Professional Consultant",
    "Architect / Designer": "Architecture & Design Firm",
    Architect: "Architecture & Design Firm",
    Engineer: "Professional Consultant",
    "Design Consultant": "Architecture & Design Firm",
    "Cost Consultant": "Cost Management & Quantity Surveying Firm",
    "Project Consultant": "Project & Construction Management Firm",

    "Service Provider": "Construction Service Provider",
    "Specialty Contractor": "Specialty Trade Contractor",
    "Specialty Trade": "Specialty Trade Contractor",

    "Project Owner": "Project Owner",
    "Owner / Developer": "Owner / Developer",
  };

  return aliases[normalizedValue] || normalizedValue;
}

function validateRequiredText({
  value,
  fieldLabel,
  minimumLength,
  maximumLength,
}: {
  value: string;
  fieldLabel: string;
  minimumLength: number;
  maximumLength: number;
}) {
  if (!value) {
    return `${fieldLabel} is required.`;
  }

  if (value.length < minimumLength) {
    return `${fieldLabel} must contain at least ${minimumLength} characters.`;
  }

  if (value.length > maximumLength) {
    return `${fieldLabel} must not exceed ${maximumLength} characters.`;
  }

  return null;
}

export async function POST(request: Request) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch (error) {
    console.warn("Company creation rejected: invalid JSON body.", {
      error,
    });

    return NextResponse.json(
      { error: "A valid JSON request body is required." },
      { status: 400 },
    );
  }

  try {
    const name = normalizeText(body.name);
    const location = normalizeText(body.location);
    const rawAccountType = normalizeText(body.accountType);
    const rawNetworkRole = normalizeText(body.networkRole);

    const nameValidationError = validateRequiredText({
      value: name,
      fieldLabel: "Company name",
      minimumLength: COMPANY_NAME_MIN_LENGTH,
      maximumLength: COMPANY_NAME_MAX_LENGTH,
    });

    if (nameValidationError) {
      return NextResponse.json(
        { error: nameValidationError },
        { status: 400 },
      );
    }

    const locationValidationError = validateRequiredText({
      value: location,
      fieldLabel: "Regional hub",
      minimumLength: LOCATION_MIN_LENGTH,
      maximumLength: LOCATION_MAX_LENGTH,
    });

    if (locationValidationError) {
      return NextResponse.json(
        { error: locationValidationError },
        { status: 400 },
      );
    }

    if (!isAccountType(rawAccountType)) {
      return NextResponse.json(
        { error: "A valid organization type is required." },
        { status: 400 },
      );
    }

    const accountConfig = ACCOUNT_TYPE_CONFIG[rawAccountType];
    const networkRole = normalizeNetworkRole(
      rawAccountType,
      rawNetworkRole,
    );

    if (!accountConfig.allowedNetworkRoles.includes(networkRole)) {
      return NextResponse.json(
        {
          error:
            "Network role is not valid for this organization type.",
        },
        { status: 400 },
      );
    }

    const baseSlug = createSlug(name);

    if (!baseSlug) {
      return NextResponse.json(
        {
          error:
            "Company name must include supported letters or numbers.",
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
      if (userError) {
        console.warn(
          "Company creation rejected: authentication lookup failed.",
          {
            error: userError,
          },
        );
      }

      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const { data: profile, error: profileReadError } =
      await supabase
        .from("profiles")
        .select("id, email, role, company_id")
        .eq("id", user.id)
        .maybeSingle();

    if (profileReadError) {
      console.error(
        "Company creation failed: profile lookup could not be completed.",
        {
          userId: user.id,
          error: profileReadError,
        },
      );

      return NextResponse.json(
        { error: WORKSPACE_ELIGIBILITY_ERROR },
        { status: 500 },
      );
    }

    const { data: ownedCompanies, error: ownedCompaniesError } =
      await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id);

    if (ownedCompaniesError) {
      console.error(
        "Company creation failed: owned-company lookup could not be completed.",
        {
          userId: user.id,
          error: ownedCompaniesError,
        },
      );

      return NextResponse.json(
        { error: WORKSPACE_ELIGIBILITY_ERROR },
        { status: 500 },
      );
    }

    const companyPlan = planOwnedCompanyResolution({
      profileCompanyId: profile?.company_id,
      ownedCompanyIds: (ownedCompanies ?? []).map(
        (ownedCompany) => ownedCompany.id,
      ),
    });

    if (companyPlan.action === "already_connected") {
      return NextResponse.json(
        { error: WORKSPACE_ALREADY_CONNECTED_ERROR },
        { status: 409 },
      );
    }

    if (companyPlan.action === "recovery_required") {
      return NextResponse.json(
        { error: WORKSPACE_RECOVERY_REQUIRED_ERROR },
        { status: 409 },
      );
    }

    const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
    let company: {
      id: string;
      name: string;
      slug: string;
    } | null = null;
    let createdNewCompany = false;

    if (companyPlan.action === "recover") {
      const { data: recoveredCompany, error: recoverError } =
        await supabase
          .from("companies")
          .select()
          .eq("id", companyPlan.companyId)
          .eq("user_id", user.id)
          .maybeSingle();

      if (recoverError || !recoveredCompany) {
        console.error(
          "Company creation failed: owned company could not be recovered.",
          {
            userId: user.id,
            companyId: companyPlan.companyId,
            error: recoverError,
          },
        );

        return NextResponse.json(
          { error: WORKSPACE_ELIGIBILITY_ERROR },
          { status: 500 },
        );
      }

      company = recoveredCompany;
    } else {
      const { data: createdCompany, error: companyError } =
        await supabase
          .from("companies")
          .insert({
            name,
            slug,
            category: networkRole,
            location,
            network_role: networkRole,
            status: "verified",
            user_id: user.id,
          })
          .select()
          .single();

      if (companyError || !createdCompany) {
        console.error(
          "Company creation failed: company record was not created.",
          {
            userId: user.id,
            slug,
            accountType: rawAccountType,
            networkRole,
            error: companyError,
          },
        );

        return NextResponse.json(
          { error: WORKSPACE_CREATE_FAILED_ERROR },
          { status: 500 },
        );
      }

      company = createdCompany;
      createdNewCompany = true;
    }

    if (!company) {
      return NextResponse.json(
        { error: WORKSPACE_CREATE_FAILED_ERROR },
        { status: 500 },
      );
    }

    const normalizedEmail = normalizeText(user.email).toLowerCase();

    const { data: bootstrapResult, error: bootstrapError } =
      await supabase.rpc(
        "bootstrap_owned_company_workspace",
        {
          p_company_id: company.id,
          p_profile_role: accountConfig.profileRole,
        },
      );

    const bootstrapPayload = bootstrapResult as
      | { success?: boolean }
      | null;

    if (bootstrapError || bootstrapPayload?.success !== true) {
      console.error(
        "Workspace bootstrap incomplete: owned-company identity was not established.",
        {
          userId: user.id,
          companyId: company.id,
          createdNewCompany,
          error: bootstrapError,
        },
      );

      return NextResponse.json(
        { error: WORKSPACE_BOOTSTRAP_INCOMPLETE_ERROR },
        { status: 500 },
      );
    }

    if (createdNewCompany) {
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          title: "Company Created",
          message: `${name} workspace was created successfully.`,
          type: "company",
          is_read: false,
          company_id: company.id,
        });

      if (notificationError) {
        console.error(
          "Company creation completed, but the notification was not recorded.",
          {
            userId: user.id,
            companyId: company.id,
            error: notificationError,
          },
        );
      }

      const { error: auditError } = await supabase
        .from("audit_logs")
        .insert({
          action: "COMPANY_CREATED",
          entity_type: "company",
          entity_id: company.id,
          user_id: user.id,
          company_id: company.id,
          metadata: {
            name,
            slug,
            category: networkRole,
            location,
            account_type: rawAccountType,
            profile_role: accountConfig.profileRole,
            network_role: networkRole,
            owner_email: normalizedEmail,
            created_at: new Date().toISOString(),
          },
        });

      if (auditError) {
        console.error(
          "Company creation completed, but the audit event was not recorded.",
          {
            userId: user.id,
            companyId: company.id,
            action: "COMPANY_CREATED",
            error: auditError,
          },
        );
      }

      try {
        if (user.email) {
          await sendEmail({
            to: user.email,
            subject: "Welcome to Nexus Pavilion",
            html: companyWelcomeEmail({
              companyName: name,
              workspaceUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/company/settings`,
            }),
          });
        }
      } catch (error) {
        console.error(
          "Company creation completed, but the welcome email failed.",
          {
            userId: user.id,
            companyId: company.id,
            error,
          },
        );
      }
    }

    return NextResponse.json({
      success: true,
      company,
      accountType: rawAccountType,
      role: accountConfig.profileRole,
      redirectTo: "/company/settings",
    });
  } catch (error) {
    console.error(
      "Unexpected company creation route failure.",
      error,
    );

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}