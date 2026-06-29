type RfqCreatedEmailProps = {
rfqTitle: string;
category: string;
budget: string;
rfqUrl: string;
procurementScope?: string;
sourcingMethod?: string;
contractFramework?: string;
};

function escapeHtml(value: string) {
return String(value || "")
.replaceAll("&", "&amp;")
.replaceAll("<", "&lt;")
.replaceAll(">", "&gt;")
.replaceAll('"', "&quot;")
.replaceAll("'", "&#039;");
}

function safeValue(value: string | null | undefined, fallback: string) {
return String(value || "").trim() || fallback;
}

export function rfqCreatedEmail({
rfqTitle,
category,
budget,
rfqUrl,
procurementScope,
sourcingMethod,
contractFramework,
}: RfqCreatedEmailProps) {
const displayTitle = escapeHtml(safeValue(rfqTitle, "New RFQ"));
const displayCategory = escapeHtml(safeValue(category, "Procurement"));
const displayBudget = escapeHtml(safeValue(budget, "Not specified"));
const displayScope = escapeHtml(
safeValue(procurementScope, "Construction RFQ")
);
const displaySourcing = escapeHtml(
safeValue(sourcingMethod, "Invited / Selective RFQ")
);
const displayFramework = escapeHtml(
safeValue(contractFramework, "Project-Specific RFQ")
);
const safeRfqUrl = escapeHtml(rfqUrl);

return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>RFQ Created Successfully</title>
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
RFQ Workspace Created
</p>

<h1 style="margin:18px 0 0;color:#ffffff;font-size:44px;line-height:1.05;font-weight:900;letter-spacing:-1.4px;">
Your RFQ has been created successfully.
</h1>

<p style="margin:22px 0 0;color:#cbd5e1;font-size:17px;line-height:1.8;font-weight:600;">
Your RFQ is now structured inside Nexus Pavilion and ready for supplier activity, quote comparison, award tracking, and executive procurement intelligence.
</p>
</td>
</tr>

<tr>
<td style="padding:36px 44px 0;background:#07111F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #24364a;border-radius:24px;background:#0b1b2c;">
<tr>
<td style="padding:28px;">
<p style="margin:0;color:#94a3b8;font-size:12px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">
RFQ Summary
</p>

<h2 style="margin:14px 0 0;color:#ffffff;font-size:34px;line-height:1.2;font-weight:900;">
${displayTitle}
</h2>

<p style="margin:12px 0 0;color:#cbd5e1;font-size:15px;line-height:1.7;font-weight:700;">
${displayCategory}
</p>

${emailInfoBlock("Procurement Scope", displayScope)}
${emailInfoBlock("Sourcing Method", displaySourcing)}
${emailInfoBlock("Contract Framework", displayFramework)}
${emailInfoBlock("Budget", displayBudget)}
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
Recommended Next Steps
</p>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
${nextStepRow("Review RFQ scope and procurement classification.")}
${nextStepRow("Invite qualified suppliers, vendors, or contractors.")}
${nextStepRow("Monitor quotes, pricing signals, procurement risk, and award readiness.")}
${nextStepRow("Use Nexus Pavilion intelligence to compare supplier responses.")}
</table>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:34px 44px 0;background:#07111F;">
<a
href="${safeRfqUrl}"
style="display:inline-block;background:#C8A646;color:#061426;text-decoration:none;padding:17px 30px;border-radius:16px;font-weight:900;font-size:15px;letter-spacing:1px;text-transform:uppercase;"
>
Open RFQ Workspace
</a>

<a
href="${safeRfqUrl}"
style="display:inline-block;margin-left:10px;background:#0b1b2c;color:#ffffff;text-decoration:none;padding:17px 30px;border-radius:16px;font-weight:900;font-size:15px;border:1px solid #24364a;"
>
Review Procurement Dashboard
</a>
</td>
</tr>

<tr>
<td style="padding:28px 44px 0;background:#07111F;">
<p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.7;font-weight:600;">
If the button does not work, copy and paste this secure RFQ workspace link into your browser:
</p>

<p style="margin:12px 0 0;word-break:break-all;color:#cbd5e1;font-size:13px;line-height:1.7;">
${safeRfqUrl}
</p>
</td>
</tr>

<tr>
<td style="padding:34px 44px 42px;background:#07111F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#061426;border:1px solid #24364a;border-radius:22px;">
<tr>
<td style="padding:24px;">
<p style="margin:0;color:#C8A646;font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
Executive Procurement Intelligence
</p>

<p style="margin:14px 0 0;color:#cbd5e1;font-size:14px;line-height:1.8;font-weight:600;">
RFQ metadata is used to improve supplier matching, quote comparison, procurement risk visibility, award readiness, executive analytics, and board-ready reporting.
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
}

function emailInfoBlock(label: string, value: string) {
return `
<div style="margin-top:16px;border-radius:18px;background:#061426;padding:18px;border:1px solid #24364a;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.18em;color:#94a3b8;text-transform:uppercase;">
${escapeHtml(label)}
</p>
<p style="margin:8px 0 0;font-size:17px;font-weight:900;color:#ffffff;">
${value}
</p>
</div>
`;
}

function nextStepRow(label: string) {
return `
<tr>
<td style="padding:10px 0;color:#e5e7eb;font-size:14px;line-height:1.7;font-weight:700;">
<span style="color:#C8A646;font-weight:900;">✓</span>
&nbsp;${escapeHtml(label)}
</td>
</tr>
`;
}