import { Resend } from "resend";

const fallbackEmailFrom = "Nexus Pavilion <no-reply@nexuspavilion.com>";

const EMAIL_NOT_CONFIGURED = "Email delivery is not configured.";
const EMAIL_MISSING_FIELDS = "Email delivery is missing required fields.";
const EMAIL_DELIVERY_FAILED = "Email delivery failed.";
const EMAIL_DELIVERY_UNAVAILABLE = "Email delivery could not be completed.";

type EmailDeliveryStatus = "sent" | "skipped" | "failed";

type EmailDeliveryFailureReason =
  | "not_configured"
  | "missing_required_fields"
  | "provider_rejected"
  | "provider_exception";

type EmailDeliveryLogEntry = {
  event: "email_delivery";
  provider: "resend";
  status: EmailDeliveryStatus;
  attempted: boolean;
  failure_reason: EmailDeliveryFailureReason | null;
  provider_message_id: string | null;
};

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

function writeEmailDeliveryLog(
  entry: Omit<EmailDeliveryLogEntry, "event" | "provider">,
) {
  const logEntry: EmailDeliveryLogEntry = {
    event: "email_delivery",
    provider: "resend",
    ...entry,
  };

  if (logEntry.status === "sent") {
    console.info("[email-delivery]", logEntry);
    return;
  }

  if (logEntry.status === "skipped") {
    console.warn("[email-delivery]", logEntry);
    return;
  }

  console.error("[email-delivery]", logEntry);
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
    writeEmailDeliveryLog({
      status: "skipped",
      attempted: false,
      failure_reason: "not_configured",
      provider_message_id: null,
    });

    return {
      success: false,
      skipped: true,
      id: null,
      error: EMAIL_NOT_CONFIGURED,
    };
  }

  if (!to || !subject || !html) {
    writeEmailDeliveryLog({
      status: "failed",
      attempted: false,
      failure_reason: "missing_required_fields",
      provider_message_id: null,
    });

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
      writeEmailDeliveryLog({
        status: "failed",
        attempted: true,
        failure_reason: "provider_rejected",
        provider_message_id: null,
      });

      return {
        success: false,
        skipped: false,
        id: null,
        error: EMAIL_DELIVERY_FAILED,
      };
    }

    const providerMessageId = data?.id || null;

    writeEmailDeliveryLog({
      status: "sent",
      attempted: true,
      failure_reason: null,
      provider_message_id: providerMessageId,
    });

    return {
      success: true,
      skipped: false,
      id: providerMessageId,
      error: null,
    };
  } catch {
    writeEmailDeliveryLog({
      status: "failed",
      attempted: true,
      failure_reason: "provider_exception",
      provider_message_id: null,
    });

    return {
      success: false,
      skipped: false,
      id: null,
      error: EMAIL_DELIVERY_UNAVAILABLE,
    };
  }
}