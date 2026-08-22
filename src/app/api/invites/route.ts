import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/send-email";
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

function escapeHtml(value: string | number | null | undefined) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function getSourcingDescription(value: SourcingMethod | null | undefined) {
  if (value === "open") {
    return "This RFQ may be visible through the open marketplace to qualified vendors that meet the buyer’s requirements.";
  }

  if (value === "sealed_bid") {
    return "This RFQ uses a controlled sealed-bid workflow. Commercial responses remain confidential and are reviewed according to the buyer’s deadline and evaluation process.";
  }

  return "This RFQ is being routed to a selected supplier shortlist. Access is controlled through this secure invitation link.";
}

function buildRfqInviteEmail({
  rfqTitle,
  category,
  budget,
  deadline,
  procurementScope,
  sourcingMethod,
  contractFramework,
  inviteUrl,
}: {
  rfqTitle: string;
  category: string;
  budget: string;
  deadline: string;
  procurementScope: string;
  sourcingMethod: string;
  contractFramework: string;
  inviteUrl: string;
}) {
  const safeRfqTitle = escapeHtml(rfqTitle || "Procurement RFQ");
  const safeCategory = escapeHtml(category || "Procurement");
  const safeBudget = escapeHtml(budget || "Not specified");
  const safeDeadline = escapeHtml(deadline || "Not specified");
  const safeProcurementScope = escapeHtml(procurementScope);
  const safeSourcingMethod = escapeHtml(sourcingMethod);
  const safeContractFramework = escapeHtml(contractFramework);
  const safeInviteUrl = escapeHtml(inviteUrl);

  const subject = `RFQ Invitation: ${rfqTitle}`;

  const text = `You have been invited to quote on ${rfqTitle}.

Category: ${category}
Procurement Scope: ${procurementScope}
Sourcing Method: ${sourcingMethod}
Contract Framework: ${contractFramework}
Budget: ${budget}
Deadline: ${deadline}

Open the secure RFQ invitation link:
${inviteUrl}

Confidentiality notice:
Supplier submissions are confidential. Competing vendors cannot view your commercial response.

Governance notice:
The buyer reserves the right to accept or reject any or all submissions, or cancel the RFQ process at any point without incurring liability or obligation to justify the decision.

Nexus Pavilion`;

  const html = `
<div style="margin:0;background:#f6f6f3;padding:32px;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:700px;margin:0 auto;overflow:hidden;border-radius:28px;border:1px solid #e5e7eb;background:#ffffff;">
<div style="background:#020617;padding:34px 32px;color:#ffffff;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.28em;color:#fb923c;text-transform:uppercase;">
Nexus Pavilion · Secure RFQ Invitation
</p>

<h1 style="margin:14px 0 0;font-size:34px;line-height:1.1;font-weight:900;color:#ffffff;">
You have been invited to quote
</h1>

<p style="margin:16px 0 0;max-width:580px;font-size:15px;line-height:1.75;color:#cbd5e1;">
A buyer has invited you to review and respond to a secure construction procurement opportunity through Nexus Pavilion.
</p>
</div>

<div style="padding:32px;">
<div style="border-radius:22px;border:1px solid #e2e8f0;background:#f8fafc;padding:24px;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.22em;color:#f97316;text-transform:uppercase;">
RFQ Opportunity
</p>

<h2 style="margin:12px 0 0;font-size:24px;line-height:1.25;font-weight:900;color:#020617;">
${safeRfqTitle}
</h2>

<p style="margin:10px 0 0;font-size:14px;line-height:1.65;color:#475569;">
${safeCategory}
</p>

${emailInfoBlock("Procurement Scope", safeProcurementScope)}
${emailInfoBlock("Sourcing Strategy", safeSourcingMethod)}
${emailInfoBlock("Contract Framework", safeContractFramework)}
${emailInfoBlock("Budget", safeBudget)}
${emailInfoBlock("Submission Deadline", safeDeadline)}
</div>

<div style="margin-top:24px;border-radius:22px;background:#fff7ed;padding:22px;border:1px solid #fed7aa;">
<p style="margin:0;font-size:12px;font-weight:900;letter-spacing:0.22em;color:#ea580c;text-transform:uppercase;">
Sourcing & Access
</p>

<p style="margin:12px 0 0;font-size:14px;line-height:1.75;color:#7c2d12;font-weight:700;">
${escapeHtml(getSourcingDescription(sourcingMethod as SourcingMethod))}
</p>
</div>

<div style="margin-top:18px;border-radius:22px;background:#f8fafc;padding:22px;border:1px solid #e2e8f0;">
<p style="margin:0;font-size:12px;font-weight:900;letter-spacing:0.22em;color:#475569;text-transform:uppercase;">
Governance Controls
</p>

<ul style="margin:14px 0 0;padding-left:20px;color:#334155;font-size:14px;line-height:1.8;font-weight:700;">
<li>Supplier submissions are confidential and not visible to competing vendors.</li>
<li>Commercial responses are reviewed only by authorized buyer-side users.</li>
<li>Submission timing is governed by the RFQ deadline shown above.</li>
<li>Quote comparison and award review are handled inside the secure workspace.</li>
</ul>
</div>

<div style="margin-top:18px;border-radius:22px;background:#fff1f2;padding:22px;border:1px solid #fecdd3;">
<p style="margin:0;font-size:12px;font-weight:900;letter-spacing:0.22em;color:#be123c;text-transform:uppercase;">
Buyer Reservation
</p>

<p style="margin:12px 0 0;font-size:13px;line-height:1.75;color:#7f1d1d;font-weight:700;">
The Buyer reserves the right to accept or reject any or all submissions, or cancel the RFQ process at any point without incurring liability or obligation to justify the decision.
</p>
</div>

<a
href="${safeInviteUrl}"
style="display:inline-block;margin-top:28px;background:#020617;color:#ffffff;padding:15px 24px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:900;"
>
Open Secure RFQ Invitation
</a>

<p style="margin-top:24px;font-size:13px;line-height:1.6;color:#64748b;">
If the button does not work, copy and paste this link into your browser:
</p>

<p style="word-break:break-all;font-size:13px;color:#334155;">
${safeInviteUrl}
</p>

<p style="margin:28px 0 0;font-size:12px;line-height:1.7;color:#94a3b8;">
This message was sent by Nexus Pavilion procurement automation. Access to this RFQ is controlled by invitation token and sourcing rules.
</p>
</div>
</div>
</div>
`;

  return { subject, html, text };
}

function emailInfoBlock(label: string, value: string) {
  return `
<div style="margin-top:14px;border-radius:16px;background:#ffffff;padding:16px;border:1px solid #e5e7eb;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.18em;color:#94a3b8;text-transform:uppercase;">
${label}
</p>
<p style="margin:6px 0 0;font-size:16px;font-weight:900;color:#020617;">
${value}
</p>
</div>
`;
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

    const invitationEmail = buildRfqInviteEmail({
      rfqTitle: rfq.title || "Procurement RFQ",
      category: rfq.category || "Procurement",
      budget: formatMoney(rfq.budget),
      deadline: formatDate(rfq.deadline),
      procurementScope,
      sourcingMethod,
      contractFramework,
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