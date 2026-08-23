import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/send-email";
import { buildRfqInvitationEmail } from "@/lib/email/templates/rfq-invitation-email";
import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import {
  getPublicSiteUrl,
  PUBLIC_SITE_URL_UNCONFIGURED,
} from "@/lib/ops/public-site-url";
import { canInviteCompanySuppliers } from "@/lib/procurement/procurement-write-authorization";
import { APPROVED_VENDOR_DOMAIN_AVAILABLE } from "@/lib/procurement/supplier-domain-availability";
import { createClient } from "@/lib/supabase/server";

type ProcurementScope =
  "material" | "subcontractor" | "equipment" | "professional_service";

type SourcingMethod = "open" | "invited" | "sealed_bid";

type ContractFramework = "project_specific" | "framework";

type InviteEmailDeliveryResult = {
  success: boolean;
  skipped: boolean;
  id: string | null;
  error: string | null;
};

function generateToken() {
  return crypto.randomUUID().replaceAll("-", "");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isRfqOpenForInvitations(
  status: string | null | undefined,
  deadline: string | null | undefined,
) {
  const normalizedStatus = String(status || "open")
    .trim()
    .toLowerCase();

  if (normalizedStatus !== "open") {
    return false;
  }

  if (!deadline) {
    return true;
  }

  const deadlineDate = new Date(deadline);

  if (Number.isNaN(deadlineDate.getTime())) {
    return true;
  }

  return deadlineDate.getTime() >= Date.now();
}

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "Not specified";
  }

  return `$${amount.toLocaleString()}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getProcurementScopeLabel(value: ProcurementScope | null | undefined) {
  if (value === "material") return "Material / Product RFQ";
  if (value === "equipment") return "Equipment Rental RFQ";
  if (value === "professional_service") return "Professional Service RFQ";
  return "Subcontractor / Trade RFQ";
}

function getSourcingMethodLabel(value: SourcingMethod | null | undefined) {
  if (value === "open") return "Open Tendering / Public Broadcast";
  if (value === "sealed_bid") return "Sealed Bid RFQ";
  return "Selective Routing / Invited RFQ";
}

function getContractFrameworkLabel(
  value: ContractFramework | null | undefined,
) {
  if (value === "framework") return "Framework Call-Off / Blanket RFQ";
  return "Project-Specific RFQ";
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;

    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Request body must contain valid JSON." },
        { status: 400 },
      );
    }

    const rfqId = String(body.rfqId || "").trim();
    const email = normalizeEmail(String(body.email || ""));
    const vendorCompanyId = String(body.vendorCompanyId || "").trim() || null;

    if (!rfqId || !email) {
      return NextResponse.json(
        { error: "RFQ ID and supplier email are required." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid supplier email address." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json(
        { error: "Company profile is required to invite suppliers." },
        { status: 403 },
      );
    }

    let membership;

    try {
      membership = await getActiveMembershipForUserCompany(
        supabase,
        user.id,
        profile.company_id,
      );
    } catch (membershipError) {
      console.error("Supplier invite membership lookup failed.", {
        userId: user.id,
        companyId: profile.company_id,
        error: membershipError,
      });

      return NextResponse.json(
        { error: "Unable to verify organization membership." },
        { status: 500 },
      );
    }

    if (!canInviteCompanySuppliers(membership, profile.company_id)) {
      return NextResponse.json(
        {
          error:
            "Only organization owners, administrators, or buyers can invite suppliers.",
        },
        { status: 403 },
      );
    }

    const { data: rfq, error: rfqError } = await supabase
      .from("rfqs")
      .select(
        "id, title, slug, company_id, status, category, budget, deadline, procurement_scope, sourcing_method, contract_framework",
      )
      .eq("id", rfqId)
      .single();

    if (rfqError || !rfq) {
      return NextResponse.json({ error: "RFQ not found." }, { status: 404 });
    }

    if (rfq.company_id !== profile.company_id) {
      return NextResponse.json(
        {
          error: "You can only invite suppliers to RFQs owned by your company.",
        },
        { status: 403 },
      );
    }

    if (!isRfqOpenForInvitations(rfq.status, rfq.deadline)) {
      return NextResponse.json(
        {
          error:
            "Supplier invitations are only available while the RFQ is open.",
        },
        { status: 409 },
      );
    }

    if (APPROVED_VENDOR_DOMAIN_AVAILABLE && vendorCompanyId) {
      const { data: approvedVendor, error: approvedVendorError } =
        await supabase
          .from("approved_vendors")
          .select("vendor_company_id, status")
          .eq("vendor_company_id", vendorCompanyId)
          .in("status", ["approved", "conditional"])
          .limit(1)
          .maybeSingle();

      if (approvedVendorError) {
        console.error(
          "Could not validate selected AVL supplier.",
          approvedVendorError,
        );

        return NextResponse.json(
          { error: "The selected AVL supplier could not be validated." },
          { status: 500 },
        );
      }

      if (!approvedVendor) {
        return NextResponse.json(
          {
            error:
              "The selected supplier is not currently approved or conditionally approved in the AVL.",
          },
          { status: 400 },
        );
      }
    }

    const { data: existingInvite, error: existingInviteError } = await supabase
      .from("rfq_invites")
      .select("id, rfq_id, email, token, status, created_at")
      .eq("rfq_id", rfq.id)
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (existingInviteError) {
      console.error(
        "Could not verify existing supplier invitations.",
        existingInviteError,
      );

      return NextResponse.json(
        { error: "Existing supplier invitations could not be verified." },
        { status: 500 },
      );
    }

    const publicSiteUrl = getPublicSiteUrl();

    if (existingInvite) {
      const existingInviteUrl = publicSiteUrl
        ? `${publicSiteUrl}/rfq/invite/${existingInvite.token}`
        : `/rfq/invite/${existingInvite.token}`;

      return NextResponse.json({
        success: true,
        invite: existingInvite,
        inviteUrl: `/rfq/invite/${existingInvite.token}`,
        absoluteInviteUrl: existingInviteUrl,
        message: "Supplier has already been invited to this RFQ.",
        email: {
          sent: false,
          skipped: true,
          error: "Existing invite reused. Email was not resent.",
        },
      });
    }

    const token = generateToken();
    const absoluteInviteUrl = publicSiteUrl
      ? `${publicSiteUrl}/rfq/invite/${token}`
      : `/rfq/invite/${token}`;

    const { data: invite, error: inviteError } = await supabase
      .from("rfq_invites")
      .insert({
        rfq_id: rfq.id,
        email,
        token,
        status: "sent",
      })
      .select()
      .single();

    if (inviteError || !invite) {
      console.error(inviteError);

      return NextResponse.json(
        { error: inviteError?.message || "Could not create supplier invite." },
        { status: 500 },
      );
    }

    const procurementScope = getProcurementScopeLabel(
      rfq.procurement_scope as ProcurementScope | null,
    );
    const sourcingMethod = getSourcingMethodLabel(
      rfq.sourcing_method as SourcingMethod | null,
    );
    const contractFramework = getContractFrameworkLabel(
      rfq.contract_framework as ContractFramework | null,
    );

    const invitationEmail = buildRfqInvitationEmail({
      rfqTitle: rfq.title || "Procurement RFQ",
      category: rfq.category || "Procurement",
      budget: formatMoney(rfq.budget),
      deadline: formatDate(rfq.deadline),
      procurementScope,
      sourcingMethod,
      contractFramework,
      sourcingMethodKey: rfq.sourcing_method,
      inviteUrl: absoluteInviteUrl,
    });

    let emailResult: InviteEmailDeliveryResult;

    if (!publicSiteUrl) {
      emailResult = {
        success: false,
        skipped: true,
        id: null,
        error: PUBLIC_SITE_URL_UNCONFIGURED,
      };
    } else {
      try {
        const result = await sendEmail({
          to: email,
          subject: invitationEmail.subject,
          html: invitationEmail.html,
          text: invitationEmail.text,
        });

        emailResult = {
          success: Boolean(result.success),
          skipped: Boolean(result.skipped),
          id: result.id ?? null,
          error: result.error ?? null,
        };
      } catch (emailError) {
        console.error("Supplier invitation email delivery failed.", emailError);

        emailResult = {
          success: false,
          skipped: false,
          id: null,
          error: "Invitation created, but email delivery failed.",
        };
      }
    }

    try {
      const { error: auditError } = await supabase.from("audit_logs").insert({
        action: "RFQ_SUPPLIER_INVITED",
        entity_type: "rfq_invite",
        entity_id: invite.id,
        user_id: user.id,
        company_id: profile.company_id,
        metadata: {
          rfq_id: rfq.id,
          rfq_title: rfq.title,
          supplier_email: email,
          vendor_company_id: APPROVED_VENDOR_DOMAIN_AVAILABLE
            ? vendorCompanyId
            : null,
          invite_token: token,
          invite_url: absoluteInviteUrl,
          procurement_scope: rfq.procurement_scope,
          procurement_scope_label: procurementScope,
          sourcing_method: rfq.sourcing_method,
          sourcing_method_label: sourcingMethod,
          contract_framework: rfq.contract_framework,
          contract_framework_label: contractFramework,
          deadline: rfq.deadline,
          email_sent: emailResult.success,
          email_skipped: emailResult.skipped,
          email_id: emailResult.id,
          email_error: emailResult.error,
          created_at: new Date().toISOString(),
        },
      });

      if (auditError) {
        console.error("Supplier invitation audit log failed.", auditError);
      }
    } catch (auditFailure) {
      console.error("Supplier invitation audit log failed.", auditFailure);
    }

    try {
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          title: "Supplier Invited",
          message: `${email} was invited to quote on ${rfq.title}.`,
          type: "invitation",
          is_read: false,
          company_id: profile.company_id,
        });

      if (notificationError) {
        console.error(
          "Supplier invitation notification failed.",
          notificationError,
        );
      }
    } catch (notificationFailure) {
      console.error(
        "Supplier invitation notification failed.",
        notificationFailure,
      );
    }

    return NextResponse.json({
      success: true,
      invite,
      inviteUrl: `/rfq/invite/${token}`,
      absoluteInviteUrl,
      vendorCompanyId: APPROVED_VENDOR_DOMAIN_AVAILABLE
        ? vendorCompanyId
        : null,
      email: {
        sent: emailResult.success,
        skipped: emailResult.skipped,
        id: emailResult.id,
        error: emailResult.error,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}