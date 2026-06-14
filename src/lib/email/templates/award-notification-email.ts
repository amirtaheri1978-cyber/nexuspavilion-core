type AwardNotificationEmailProps = {
rfqTitle: string;
amount: string;
awardUrl: string;
};

export function awardNotificationEmail({
rfqTitle,
amount,
awardUrl,
}: AwardNotificationEmailProps) {
return `
<div style="font-family:Arial,sans-serif;background:#f6f6f3;padding:32px;">
<div style="max-width:680px;margin:auto;background:#ffffff;border-radius:28px;padding:36px;border:1px solid #e5e7eb;">

<p style="color:#f97316;font-size:12px;font-weight:800;letter-spacing:.25em;text-transform:uppercase;">
NEXUS PAVILION PROCUREMENT INTELLIGENCE
</p>

<h1 style="font-size:34px;line-height:1.1;color:#020617;margin:12px 0 0;font-weight:900;">
Contract Award Confirmed
</h1>

<p style="margin-top:18px;color:#475569;font-size:15px;line-height:1.8;">
A supplier selection decision has been completed and recorded within the Nexus Pavilion procurement workspace.
The award event has been logged for governance, reporting, and audit visibility.
</p>

<div style="margin-top:28px;background:#f8fafc;border-radius:20px;padding:24px;">

<p style="margin:0;color:#64748b;font-size:12px;font-weight:700;">
PROCUREMENT OPPORTUNITY
</p>

<p style="margin:6px 0 18px;color:#020617;font-size:22px;font-weight:900;">
${rfqTitle}
</p>

<p style="margin:0;color:#64748b;font-size:12px;font-weight:700;">
AWARD VALUE
</p>

<p style="margin:6px 0 18px;color:#020617;font-size:20px;font-weight:900;">
${amount}
</p>

<p style="margin:0;color:#64748b;font-size:12px;font-weight:700;">
STATUS
</p>

<p style="margin:6px 0 18px;color:#16a34a;font-size:18px;font-weight:900;">
Awarded
</p>

<p style="margin:0;color:#64748b;font-size:12px;font-weight:700;">
PROCUREMENT RECORD
</p>

<p style="margin:6px 0 0;color:#020617;font-size:15px;font-weight:700;">
Award decision successfully recorded.
</p>

</div>

<div style="margin-top:24px;padding:20px;background:#ecfeff;border-radius:18px;">
<p style="margin:0;font-size:14px;font-weight:800;color:#0f172a;">
Executive Procurement Notice
</p>

<p style="margin-top:8px;color:#334155;font-size:14px;line-height:1.7;">
This award contributes to procurement analytics, supplier performance metrics,
contract award reporting, and executive procurement intelligence dashboards.
</p>
</div>

<a
href="${awardUrl}"
style="display:inline-block;margin-top:28px;padding:15px 26px;background:#020617;color:white;text-decoration:none;border-radius:999px;font-weight:800;font-size:14px;"
>
Review Award →
</a>

<p style="margin-top:32px;font-size:12px;color:#64748b;font-weight:700;">
Governance & Compliance
</p>

<p style="margin-top:8px;font-size:12px;line-height:1.8;color:#94a3b8;">
This award notification forms part of the Nexus Pavilion procurement audit trail.
The Buyer reserves the right to amend, cancel, reject, or re-evaluate procurement decisions in accordance with organizational procurement policies and applicable contractual obligations.
</p>

<p style="margin-top:24px;font-size:11px;color:#cbd5e1;">
© Nexus Pavilion Procurement Intelligence Platform
</p>

</div>
</div>
`;
}
