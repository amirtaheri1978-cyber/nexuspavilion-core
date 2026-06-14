type RfqCreatedEmailProps = {
rfqTitle: string;
category: string;
budget: string;
rfqUrl: string;
procurementScope?: string;
sourcingMethod?: string;
contractFramework?: string;
};

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
const displayTitle = safeValue(rfqTitle, "New RFQ");
const displayCategory = safeValue(category, "Procurement");
const displayBudget = safeValue(budget, "Not specified");
const displayScope = safeValue(procurementScope, "Construction RFQ");
const displaySourcing = safeValue(sourcingMethod, "Invited / Selective RFQ");
const displayFramework = safeValue(contractFramework, "Project-Specific RFQ");

return `
<div style="margin:0;background:#f6f6f3;padding:32px;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:680px;margin:0 auto;overflow:hidden;border-radius:28px;border:1px solid #e5e7eb;background:#ffffff;">
<div style="background:#020617;padding:34px 32px;color:#ffffff;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.28em;color:#fb923c;text-transform:uppercase;">
Nexus Pavilion · Construction Procurement
</p>

<h1 style="margin:14px 0 0;font-size:34px;line-height:1.1;font-weight:900;color:#ffffff;">
RFQ Created Successfully
</h1>

<p style="margin:16px 0 0;max-width:560px;font-size:15px;line-height:1.75;color:#cbd5e1;">
Your RFQ has been published as a structured construction procurement opportunity and is ready for supplier activity, quote comparison, award tracking, and executive intelligence.
</p>
</div>

<div style="padding:32px;">
<div style="border-radius:22px;border:1px solid #e2e8f0;background:#f8fafc;padding:24px;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.22em;color:#f97316;text-transform:uppercase;">
RFQ Summary
</p>

<h2 style="margin:12px 0 0;font-size:24px;line-height:1.25;font-weight:900;color:#020617;">
${displayTitle}
</h2>

<p style="margin:10px 0 0;font-size:14px;line-height:1.65;color:#475569;">
${displayCategory}
</p>

<div style="margin-top:22px;display:block;">
<div style="margin-bottom:12px;border-radius:16px;background:#ffffff;padding:16px;border:1px solid #e5e7eb;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.18em;color:#94a3b8;text-transform:uppercase;">
Procurement Scope
</p>
<p style="margin:6px 0 0;font-size:16px;font-weight:900;color:#020617;">
${displayScope}
</p>
</div>

<div style="margin-bottom:12px;border-radius:16px;background:#ffffff;padding:16px;border:1px solid #e5e7eb;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.18em;color:#94a3b8;text-transform:uppercase;">
Sourcing Method
</p>
<p style="margin:6px 0 0;font-size:16px;font-weight:900;color:#020617;">
${displaySourcing}
</p>
</div>

<div style="margin-bottom:12px;border-radius:16px;background:#ffffff;padding:16px;border:1px solid #e5e7eb;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.18em;color:#94a3b8;text-transform:uppercase;">
Contract Framework
</p>
<p style="margin:6px 0 0;font-size:16px;font-weight:900;color:#020617;">
${displayFramework}
</p>
</div>

<div style="border-radius:16px;background:#ffffff;padding:16px;border:1px solid #e5e7eb;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.18em;color:#94a3b8;text-transform:uppercase;">
Budget
</p>
<p style="margin:6px 0 0;font-size:18px;font-weight:900;color:#020617;">
${displayBudget}
</p>
</div>
</div>
</div>

<div style="margin-top:24px;border-radius:22px;background:#fff7ed;padding:22px;border:1px solid #fed7aa;">
<p style="margin:0;font-size:12px;font-weight:900;letter-spacing:0.22em;color:#ea580c;text-transform:uppercase;">
Next Steps
</p>

<ul style="margin:14px 0 0;padding-left:20px;color:#7c2d12;font-size:14px;line-height:1.8;font-weight:700;">
<li>Review RFQ scope and procurement classification.</li>
<li>Invite qualified suppliers or contractors.</li>
<li>Monitor quotes, pricing signals, risk, and award readiness.</li>
<li>Use Nexus intelligence to compare supplier responses.</li>
</ul>
</div>

<a
href="${rfqUrl}"
style="display:inline-block;margin-top:28px;background:#020617;color:#ffffff;padding:15px 24px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:900;"
>
Open RFQ Workspace
</a>

<p style="margin:28px 0 0;font-size:12px;line-height:1.7;color:#94a3b8;">
This message was sent by Nexus Pavilion procurement automation. RFQ metadata is used to improve supplier matching, quote comparison, executive analytics, and procurement reporting.
</p>
</div>
</div>
</div>
`;
}