import { Resend } from "resend";

const fallbackEmailFrom = "Nexus Pavilion <onboarding@resend.dev>";

export type SendEmailInput = {
to: string;
subject: string;
html: string;
text?: string;
};

export type SendEmailResult = {
success: boolean;
skipped: boolean;
id: string | null;
error: string | null;
};

function getEmailFrom() {
return process.env.EMAIL_FROM || fallbackEmailFrom;
}

export async function sendEmail({
to,
subject,
html,
text,
}: SendEmailInput): Promise<SendEmailResult> {
const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = getEmailFrom();

if (!resendApiKey) {
console.warn("RESEND_API_KEY is not configured. Email was not sent.");

return {
success: false,
skipped: true,
id: null,
error: "RESEND_API_KEY is not configured.",
};
}

if (!to || !subject || !html) {
return {
success: false,
skipped: false,
id: null,
error: "Missing required email fields.",
};
}

try {
const resend = new Resend(resendApiKey);

const { data, error } = await resend.emails.send({
from: emailFrom,
to,
subject,
html,
text,
});

if (error) {
console.error("Resend email error:", error);

return {
success: false,
skipped: false,
id: null,
error: error.message || "Failed to send email.",
};
}

return {
success: true,
skipped: false,
id: data?.id || null,
error: null,
};
} catch (error) {
console.error("Unexpected email error:", error);

return {
success: false,
skipped: false,
id: null,
error:
error instanceof Error
? error.message
: "Unexpected email sending error.",
};
}
}