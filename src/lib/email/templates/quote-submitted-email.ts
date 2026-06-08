type QuoteSubmittedEmailProps = {
rfqTitle: string;
amount: string;
timeline: string;
quoteUrl: string;
};

export function quoteSubmittedEmail({
rfqTitle,
amount,
timeline,
quoteUrl,
}: QuoteSubmittedEmailProps) {
return `
<div style="font-family:Arial,sans-serif;background:#f6f6f3;padding:32px;">
<div style="max-width:640px;margin:auto;background:#ffffff;border-radius:24px;padding:32px;">

<p style="color:#f97316;font-size:12px;font-weight:800;letter-spacing:.2em;">
NEXUS PAVILION
</p>

<h1 style="font-size:32px;color:#020617;">
Quote Submitted Successfully
</h1>

<p style="color:#475569;">
Your quote has been submitted and recorded in the procurement workspace.
</p>

<div style="background:#f8fafc;padding:20px;border-radius:16px;margin-top:20px;">
<p><strong>RFQ:</strong> ${rfqTitle}</p>
<p><strong>Amount:</strong> ${amount}</p>
<p><strong>Timeline:</strong> ${timeline}</p>
</div>

<a
href="${quoteUrl}"
style="display:inline-block;margin-top:24px;padding:14px 22px;background:#020617;color:white;text-decoration:none;border-radius:999px;font-weight:700;"
>
View Quote
</a>

</div>
</div>
`;
}