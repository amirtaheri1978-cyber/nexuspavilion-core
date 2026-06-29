import { Resend } from "resend";

const fallbackEmailFrom = "Nexus Pavilion <no-reply@nexuspavilion.com>";

export type SendEmailInput = {
to: string;
subject: string;
html: string;
text?: string;
replyTo?: string;
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

function getFriendlyEmailError(error: unknown) {
if (error instanceof Error && error.message) {
return error.message;
}

return "Email delivery could not be completed.";
}

export async function sendEmail({
to,
subject,
html,
text,
replyTo,
}: SendEmailInput): Promise<SendEmailResult> {
const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = getEmailFrom();

if (!resendApiKey) {
console.warn("RESEND_API_KEY is not configured. Email was not sent.");

return {
success: false,
skipped: true,
id: null,
error: "Email delivery is not configured.",
};
}

if (!to || !subject || !html) {
return {
success: false,
skipped: false,
id: null,
error: "Email delivery is missing required fields.",
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
replyTo,
});

if (error) {
console.error("Nexus Pavilion email delivery error:", error);

return {
success: false,
skipped: false,
id: null,
error: error.message || "Email delivery failed.",
};
}

return {
success: true,
skipped: false,
id: data?.id || null,
error: null,
};
} catch (error) {
console.error("Unexpected Nexus Pavilion email delivery error:", error);

return {
success: false,
skipped: false,
id: null,
error: getFriendlyEmailError(error),
};
}
}