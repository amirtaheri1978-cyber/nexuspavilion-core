type QuoteSubmittedEmailProps = {
rfqTitle: string;
amount: string;
timeline: string;
quoteUrl: string;
};

function escapeHtml(value: string) {
return String(value || "")
.replaceAll("&", "&amp;")
.replaceAll("<", "&lt;")
.replaceAll(">", "&gt;")
.replaceAll('"', "&quot;")
.replaceAll("'", "&#039;");
}

export function quoteSubmittedEmail({
rfqTitle,
amount,
timeline,
quoteUrl,
}: QuoteSubmittedEmailProps) {
const safeTitle = escapeHtml(rfqTitle);
const safeAmount = escapeHtml(amount);
const safeTimeline = escapeHtml(timeline);
const safeUrl = escapeHtml(quoteUrl);

return `
<div style="margin:0;background:#f6f6f3;padding:32px;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:720px;margin:0 auto;border-radius:28px;overflow:hidden;background:#ffffff;border:1px solid #e5e7eb;">

<div style="background:#020617;padding:36px;color:#ffffff;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.3em;color:#fb923c;text-transform:uppercase;">
Nexus Pavilion Procurement Network
</p>

<h1 style="margin:16px 0 0;font-size:34px;line-height:1.1;font-weight:900;">
Quote Submitted Successfully
</h1>

<p style="margin-top:16px;font-size:15px;line-height:1.8;color:#cbd5e1;">
Your commercial submission has been successfully recorded inside the Nexus Pavilion procurement platform and is now available for buyer-side evaluation.
</p>
</div>

<div style="padding:32px;">

<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:22px;padding:24px;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.2em;color:#f97316;text-transform:uppercase;">
Submission Summary
</p>

<div style="margin-top:18px;">
<p style="margin:0;font-size:12px;font-weight:800;color:#94a3b8;text-transform:uppercase;">
RFQ
</p>

<p style="margin:6px 0 0;font-size:22px;font-weight:900;color:#020617;">
${safeTitle}
</p>
</div>

<div style="margin-top:18px;">
<p style="margin:0;font-size:12px;font-weight:800;color:#94a3b8;text-transform:uppercase;">
Submitted Amount
</p>

<p style="margin:6px 0 0;font-size:18px;font-weight:800;color:#020617;">
${safeAmount}
</p>
</div>

<div style="margin-top:18px;">
<p style="margin:0;font-size:12px;font-weight:800;color:#94a3b8;text-transform:uppercase;">
Delivery Timeline
</p>

<p style="margin:6px 0 0;font-size:18px;font-weight:800;color:#020617;">
${safeTimeline}
</p>
</div>
</div>

<div style="margin-top:24px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:20px;padding:22px;">
<p style="margin:0;font-size:12px;font-weight:900;letter-spacing:0.2em;color:#2563eb;text-transform:uppercase;">
Confidential Submission Notice
</p>

<p style="margin-top:12px;font-size:14px;line-height:1.8;color:#1e3a8a;font-weight:700;">
Your pricing, commercial proposal, and supporting information remain confidential.
Competing suppliers cannot access or view your submission.
</p>
</div>

<div style="margin-top:18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;padding:22px;">
<p style="margin:0;font-size:12px;font-weight:900;letter-spacing:0.2em;color:#15803d;text-transform:uppercase;">
Evaluation Workflow
</p>

<ul style="margin:12px 0 0;padding-left:18px;color:#166534;font-size:14px;line-height:1.9;font-weight:700;">
<li>Your submission has been securely recorded.</li>
<li>Buyer-side evaluators may now review commercial and technical responses.</li>
<li>Evaluation results remain confidential until award decision.</li>
<li>You may receive clarification requests during evaluation.</li>
</ul>
</div>

<div style="margin-top:18px;background:#fff7ed;border:1px solid #fed7aa;border-radius:20px;padding:22px;">
<p style="margin:0;font-size:12px;font-weight:900;letter-spacing:0.2em;color:#ea580c;text-transform:uppercase;">
Governance & Compliance
</p>

<ul style="margin:12px 0 0;padding-left:18px;color:#9a3412;font-size:14px;line-height:1.9;font-weight:700;">
<li>Late submissions are automatically rejected after RFQ deadline.</li>
<li>Supplier identities and bid information remain protected.</li>
<li>All submission activity is recorded in the audit trail.</li>
<li>Evaluation decisions are controlled by authorized procurement users.</li>
</ul>
</div>

<div style="margin-top:18px;background:#fff1f2;border:1px solid #fecdd3;border-radius:20px;padding:22px;">
<p style="margin:0;font-size:12px;font-weight:900;letter-spacing:0.2em;color:#be123c;text-transform:uppercase;">
Buyer Reservation Rights
</p>

<p style="margin-top:12px;font-size:13px;line-height:1.8;color:#881337;font-weight:700;">
The Buyer reserves the right to accept or reject any or all submissions,
request clarifications, negotiate commercial terms, or cancel the RFQ process
without incurring liability or obligation to justify the decision.
</p>
</div>

<a
href="${safeUrl}"
style="display:inline-block;margin-top:28px;padding:15px 24px;background:#020617;color:#ffffff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:900;"
>
View Submission
</a>

<p style="margin-top:24px;font-size:13px;line-height:1.7;color:#64748b;">
If the button above does not work, copy and paste this link into your browser:
</p>

<p style="word-break:break-all;font-size:13px;color:#334155;">
${safeUrl}
</p>

<p style="margin-top:28px;font-size:12px;line-height:1.8;color:#94a3b8;">
This message was generated automatically by Nexus Pavilion Procurement Intelligence.
Submission records, evaluation activity, and award decisions are maintained within the secure procurement workspace.
</p>

</div>
</div>
</div>
`;
}