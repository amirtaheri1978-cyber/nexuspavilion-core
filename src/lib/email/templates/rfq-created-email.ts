type RfqCreatedEmailProps = {
rfqTitle: string;
category: string;
budget: string;
rfqUrl: string;
};

export function rfqCreatedEmail({
rfqTitle,
category,
budget,
rfqUrl,
}: RfqCreatedEmailProps) {
return `
<div style="font-family: Arial, sans-serif; background: #f6f6f3; padding: 32px;">
<div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 32px; border: 1px solid #e5e7eb;">
<p style="font-size: 12px; font-weight: 800; letter-spacing: 0.2em; color: #f97316; text-transform: uppercase;">
Nexus Pavilion RFQ
</p>

<h1 style="margin: 12px 0 0; font-size: 32px; line-height: 1.15; color: #020617;">
RFQ Created Successfully
</h1>

<p style="margin-top: 16px; font-size: 15px; line-height: 1.7; color: #475569;">
Your RFQ has been created and is now available inside your Nexus Pavilion workspace.
</p>

<div style="margin-top: 24px; background: #f8fafc; border-radius: 18px; padding: 20px;">
<p style="margin: 0; font-size: 13px; color: #64748b;">RFQ Title</p>
<p style="margin: 6px 0 0; font-size: 18px; font-weight: 800; color: #020617;">${rfqTitle}</p>

<p style="margin: 18px 0 0; font-size: 13px; color: #64748b;">Category</p>
<p style="margin: 6px 0 0; font-size: 16px; font-weight: 700; color: #020617;">${category}</p>

<p style="margin: 18px 0 0; font-size: 13px; color: #64748b;">Budget</p>
<p style="margin: 6px 0 0; font-size: 16px; font-weight: 700; color: #020617;">${budget}</p>
</div>

<a
href="${rfqUrl}"
style="display: inline-block; margin-top: 28px; background: #020617; color: #ffffff; padding: 14px 22px; border-radius: 999px; text-decoration: none; font-size: 14px; font-weight: 800;"
>
View RFQ
</a>

<p style="margin-top: 28px; font-size: 12px; line-height: 1.6; color: #94a3b8;">
This email was sent by Nexus Pavilion procurement automation.
</p>
</div>
</div>
`;
}