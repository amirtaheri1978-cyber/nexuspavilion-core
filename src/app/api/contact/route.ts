import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/send-email";

type ContactRequestBody = {
name?: string;
email?: string;
company?: string;
inquiryType?: string;
message?: string;
website?: string;
};

function isValidEmail(email: string) {
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value: string) {
return value
.replaceAll("&", "&amp;")
.replaceAll("<", "&lt;")
.replaceAll(">", "&gt;")
.replaceAll('"', "&quot;")
.replaceAll("'", "&#039;");
}

export async function POST(request: Request) {
try {
const body = (await request.json()) as ContactRequestBody;

const name = body.name?.trim() || "";
const email = body.email?.trim().toLowerCase() || "";
const company = body.company?.trim() || "Not provided";
const inquiryType = body.inquiryType?.trim() || "General Inquiry";
const message = body.message?.trim() || "";
const website = body.website?.trim() || "";

if (website) {
return NextResponse.json({
success: true,
message: "Contact request sent successfully.",
});
}

if (name.length < 2) {
return NextResponse.json(
{
success: false,
message: "Please enter your full name.",
},
{ status: 400 },
);
}

if (!isValidEmail(email)) {
return NextResponse.json(
{
success: false,
message: "Please provide a valid email address.",
},
{ status: 400 },
);
}

if (message.length < 20) {
return NextResponse.json(
{
success: false,
message: "Please include a message with at least 20 characters.",
},
{ status: 400 },
);
}

const safeName = escapeHtml(name);
const safeEmail = escapeHtml(email);
const safeCompany = escapeHtml(company);
const safeInquiryType = escapeHtml(inquiryType);
const safeMessage = escapeHtml(message).replaceAll("\n", "<br />");

const contactEmail =
process.env.CONTACT_EMAIL || "a.mirtaheri1978@gmail.com";

const emailResult = await sendEmail({
to: contactEmail,
subject: `New Nexus Pavilion contact request: ${inquiryType}`,
html: `
<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
<h2>New Nexus Pavilion Contact Request</h2>
<p><strong>Name:</strong> ${safeName}</p>
<p><strong>Email:</strong> ${safeEmail}</p>
<p><strong>Company:</strong> ${safeCompany}</p>
<p><strong>Inquiry Type:</strong> ${safeInquiryType}</p>
<hr />
<p><strong>Message:</strong></p>
<p>${safeMessage}</p>
</div>
`,
text: [
"New Nexus Pavilion Contact Request",
`Name: ${name}`,
`Email: ${email}`,
`Company: ${company}`,
`Inquiry Type: ${inquiryType}`,
"",
"Message:",
message,
].join("\n"),
});

if (emailResult.skipped) {
return NextResponse.json(
{
success: false,
message:
"Contact request received, but email delivery is not configured.",
},
{ status: 503 },
);
}

if (!emailResult.success) {
return NextResponse.json(
{
success: false,
message: emailResult.error || "Failed to send contact request.",
},
{ status: 500 },
);
}

return NextResponse.json({
success: true,
message: "Contact request sent successfully.",
});
} catch (error) {
console.error("Contact API error:", error);

return NextResponse.json(
{
success: false,
message: "Unable to process contact request.",
},
{ status: 500 },
);
}
}