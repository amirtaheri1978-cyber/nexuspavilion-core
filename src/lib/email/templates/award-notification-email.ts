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
<div style="max-width:640px;margin:auto;background:#ffffff;border-radius:24px;padding:32px;border:1px solid #e5e7eb;">
<p style="color:#f97316;font-size:12px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;">
Nexus Pavilion Award
</p>

<h1 style="font-size:32px;line-height:1.15;color:#020617;margin:12px 0 0;">
Contract Awarded
</h1>

<p style="margin-top:16px;color:#475569;line-height:1.7;">
A procurement contract has been awarded in Nexus Pavilion.
</p>

<div style="background:#f8fafc;padding:20px;border-radius:16px;margin-top:20px;">
<p style="margin:0;color:#64748b;font-size:13px;">Project</p>
<p style="margin:6px 0 0;color:#020617;font-size:18px;font-weight:800;">${rfqTitle}</p>

<p style="margin:18px 0 0;color:#64748b;font-size:13px;">Award Amount</p>
<p style="margin:6px 0 0;color:#020617;font-size:18px;font-weight:800;">${amount}</p>
</div>

<a
href="${awardUrl}"
style="display:inline-block;margin-top:24px;padding:14px 22px;background:#020617;color:white;text-decoration:none;border-radius:999px;font-weight:800;"
>
View Award
</a>

<p style="margin-top:28px;font-size:12px;line-height:1.6;color:#94a3b8;">
This email was sent by Nexus Pavilion procurement automation.
</p>
</div>
</div>
`;
}
