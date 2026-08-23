type SourcingMethod = "open" | "invited" | "sealed_bid";

type RfqInvitationEmailInput = {
  rfqTitle: string;
  category: string;
  budget: string;
  deadline: string;
  procurementScope: string;
  sourcingMethod: string;
  contractFramework: string;
  sourcingMethodKey?: string | null;
  inviteUrl: string;
};

function escapeHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeSourcingMethod(
  value: string | null | undefined,
): SourcingMethod | null {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "open") return "open";
  if (normalized === "sealed_bid") return "sealed_bid";
  if (normalized === "invited") return "invited";

  return null;
}

function getSourcingDescription(
  sourcingMethodKey: string | null | undefined,
  sourcingMethodLabel: string,
) {
  const sourcingMethod =
    normalizeSourcingMethod(sourcingMethodKey) ||
    normalizeSourcingMethod(sourcingMethodLabel);

  if (sourcingMethod === "open") {
    return "This RFQ may be visible through the open marketplace to qualified vendors that meet the buyer’s requirements.";
  }

  if (sourcingMethod === "sealed_bid") {
    return "This RFQ uses a controlled sealed-bid workflow. Commercial responses remain confidential and are reviewed according to the buyer’s deadline and evaluation process.";
  }

  return "This RFQ is being routed to a selected supplier shortlist. Access is controlled through this secure invitation link.";
}

export function buildRfqInvitationEmail({
  rfqTitle,
  category,
  budget,
  deadline,
  procurementScope,
  sourcingMethod,
  contractFramework,
  sourcingMethodKey,
  inviteUrl,
}: RfqInvitationEmailInput) {
  const displayTitle = String(rfqTitle || "").trim() || "Procurement RFQ";
  const displayCategory = String(category || "").trim() || "Procurement";
  const displayBudget = String(budget || "").trim() || "Not specified";
  const displayDeadline = String(deadline || "").trim() || "Not specified";
  const displayScope = String(procurementScope || "").trim();
  const displaySourcing = String(sourcingMethod || "").trim();
  const displayFramework = String(contractFramework || "").trim();

  const safeRfqTitle = escapeHtml(displayTitle);
  const safeCategory = escapeHtml(displayCategory);
  const safeBudget = escapeHtml(displayBudget);
  const safeDeadline = escapeHtml(displayDeadline);
  const safeProcurementScope = escapeHtml(displayScope);
  const safeSourcingMethod = escapeHtml(displaySourcing);
  const safeContractFramework = escapeHtml(displayFramework);
  const safeInviteUrl = escapeHtml(inviteUrl);
  const sourcingDescription = getSourcingDescription(
    sourcingMethodKey,
    displaySourcing,
  );

  const subject = `RFQ Invitation: ${displayTitle}`;

  const text = `You have been invited to quote on ${displayTitle}.

Category: ${displayCategory}
Procurement Scope: ${displayScope}
Sourcing Method: ${displaySourcing}
Contract Framework: ${displayFramework}
Budget: ${displayBudget}
Deadline: ${displayDeadline}

Open the secure RFQ invitation link:
${inviteUrl}

Confidentiality notice:
Supplier submissions are confidential. Competing vendors cannot view your commercial response.

Governance notice:
The buyer reserves the right to accept or reject any or all submissions, or cancel the RFQ process at any point without incurring liability or obligation to justify the decision.

Nexus Pavilion`;

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Secure RFQ Invitation</title>
</head>

<body style="margin:0;padding:0;background:#061426;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:34px 16px;background:#061426;">
<tr>
<td align="center">
<table width="720" cellpadding="0" cellspacing="0" border="0" style="max-width:720px;width:100%;background:#07111F;border-radius:30px;overflow:hidden;border:1px solid #1f3347;box-shadow:0 28px 90px rgba(0,0,0,0.38);">

<tr>
<td style="padding:42px 44px 34px;background:#07111F;border-bottom:1px solid #1f3347;">
<div style="display:inline-block;background:#020617;border:1px solid #1f3347;border-radius:20px;padding:16px 20px;">
<p style="margin:0;color:#ffffff;font-size:22px;font-weight:900;letter-spacing:-0.02em;">
Nexus Pavilion
</p>
<p style="margin:6px 0 0;color:#C8A646;font-size:10px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
Enterprise Procurement Intelligence
</p>
</div>

<p style="margin:34px 0 0;color:#C8A646;font-size:12px;font-weight:900;letter-spacing:5px;text-transform:uppercase;">
Secure RFQ Invitation
</p>

<h1 style="margin:18px 0 0;color:#ffffff;font-size:44px;line-height:1.05;font-weight:900;letter-spacing:-1.4px;">
You have been invited to quote.
</h1>

<p style="margin:22px 0 0;color:#cbd5e1;font-size:17px;line-height:1.8;font-weight:600;">
A buyer has invited you to review and respond to a secure construction procurement opportunity through Nexus Pavilion.
</p>
</td>
</tr>

<tr>
<td style="padding:36px 44px 0;background:#07111F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #24364a;border-radius:24px;background:#0b1b2c;">
<tr>
<td style="padding:28px;">
<p style="margin:0;color:#94a3b8;font-size:12px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">
RFQ Opportunity
</p>

<h2 style="margin:14px 0 0;color:#ffffff;font-size:34px;line-height:1.2;font-weight:900;">
${safeRfqTitle}
</h2>

<p style="margin:12px 0 0;color:#cbd5e1;font-size:15px;line-height:1.7;font-weight:700;">
${safeCategory}
</p>

${emailInfoBlock("Procurement Scope", safeProcurementScope)}
${emailInfoBlock("Sourcing Strategy", safeSourcingMethod)}
${emailInfoBlock("Contract Framework", safeContractFramework)}
${emailInfoBlock("Budget", safeBudget)}
${emailInfoBlock("Submission Deadline", safeDeadline)}
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:30px 44px 0;background:#07111F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b1b2c;border:1px solid #24364a;border-radius:24px;">
<tr>
<td style="padding:26px;">
<p style="margin:0;color:#C8A646;font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
Sourcing & Access
</p>

<p style="margin:14px 0 0;color:#cbd5e1;font-size:14px;line-height:1.8;font-weight:600;">
${escapeHtml(sourcingDescription)}
</p>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:18px 44px 0;background:#07111F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b1b2c;border:1px solid #24364a;border-radius:24px;">
<tr>
<td style="padding:26px;">
<p style="margin:0;color:#C8A646;font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
Procurement Governance
</p>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
${governanceRow("Supplier submissions are confidential and not visible to competing vendors.")}
${governanceRow("Commercial responses are reviewed only by authorized buyer-side users.")}
${governanceRow("Submission timing is governed by the RFQ deadline shown above.")}
${governanceRow("Quote comparison and award review are handled inside the secure workspace.")}
</table>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:18px 44px 0;background:#07111F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b1b2c;border:1px solid #24364a;border-radius:24px;">
<tr>
<td style="padding:26px;">
<p style="margin:0;color:#C8A646;font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
Buyer Reservation
</p>

<p style="margin:14px 0 0;color:#cbd5e1;font-size:14px;line-height:1.8;font-weight:600;">
The Buyer reserves the right to accept or reject any or all submissions, or cancel the RFQ process at any point without incurring liability or obligation to justify the decision.
</p>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:34px 44px 0;background:#07111F;">
<a
href="${safeInviteUrl}"
style="display:inline-block;background:#C8A646;color:#061426;text-decoration:none;padding:17px 30px;border-radius:16px;font-weight:900;font-size:15px;letter-spacing:1px;text-transform:uppercase;"
>
Open Secure RFQ Invitation
</a>

<a
href="${safeInviteUrl}"
style="display:inline-block;margin-left:10px;background:#0b1b2c;color:#ffffff;text-decoration:none;padding:17px 30px;border-radius:16px;font-weight:900;font-size:15px;border:1px solid #24364a;"
>
Open Secure Link
</a>
</td>
</tr>

<tr>
<td style="padding:28px 44px 0;background:#07111F;">
<p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.7;font-weight:600;">
If the button does not work, copy and paste this secure invitation link into your browser:
</p>

<p style="margin:12px 0 0;word-break:break-all;color:#cbd5e1;font-size:13px;line-height:1.7;">
${safeInviteUrl}
</p>
</td>
</tr>

<tr>
<td style="padding:34px 44px 42px;background:#07111F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#061426;border:1px solid #24364a;border-radius:22px;">
<tr>
<td style="padding:24px;">
<p style="margin:0;color:#C8A646;font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
Security Notice
</p>

<p style="margin:14px 0 0;color:#cbd5e1;font-size:14px;line-height:1.8;font-weight:600;">
This message was sent by Nexus Pavilion procurement automation. Access to this RFQ is controlled by invitation and sourcing rules. Quote submission happens inside the authenticated supplier workspace after this invitation is validated.
</p>
</td>
</tr>
</table>

<p style="margin:30px 0 0;color:#64748b;font-size:13px;line-height:1.8;font-weight:600;">
Nexus Pavilion Procurement Intelligence Platform<br />
Supplier Intelligence • RFQ Management • Award Analytics • Executive Reporting
</p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>
`;

  return {
    subject,
    html,
    text,
  };
}

function emailInfoBlock(label: string, value: string) {
  return `
<div style="margin-top:16px;border-radius:18px;background:#061426;padding:18px;border:1px solid #24364a;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.18em;color:#94a3b8;text-transform:uppercase;">
${label}
</p>
<p style="margin:8px 0 0;font-size:17px;font-weight:900;color:#ffffff;">
${value}
</p>
</div>
`;
}

function governanceRow(label: string) {
  return `
<tr>
<td style="padding:10px 0;color:#e5e7eb;font-size:14px;line-height:1.7;font-weight:700;">
<span style="color:#C8A646;font-weight:900;">✓</span>
&nbsp;${escapeHtml(label)}
</td>
</tr>
`;
}
