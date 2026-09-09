import { Resend } from "resend";

const fallbackEmailFrom = "Nexus Pavilion <no-reply@nexuspavilion.com>";

const EMAIL_NOT_CONFIGURED = "Email delivery is not configured.";
const EMAIL_MISSING_FIELDS = "Email delivery is missing required fields.";
const EMAIL_DELIVERY_FAILED = "Email delivery failed.";
const EMAIL_DELIVERY_UNAVAILABLE = "Email delivery could not be completed.";

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
      error: EMAIL_NOT_CONFIGURED,
    };
  }

  if (!to || !subject || !html) {
    return {
      success: false,
      skipped: false,
      id: null,
      error: EMAIL_MISSING_FIELDS,
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
        error: EMAIL_DELIVERY_FAILED,
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
      error: EMAIL_DELIVERY_UNAVAILABLE,
    };
  }
}
