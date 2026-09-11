import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = {
      send: sendMock,
    };
  },
}));

import { sendEmail } from "@/lib/email/send-email";

const ORIGINAL_API_KEY = process.env.RESEND_API_KEY;
const ORIGINAL_EMAIL_FROM = process.env.EMAIL_FROM;

describe("sendEmail provider contract", () => {
  beforeEach(() => {
    sendMock.mockReset();
    process.env.RESEND_API_KEY = "test-resend-key";
    process.env.EMAIL_FROM = "Nexus Pavilion <invites@example.test>";

    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (ORIGINAL_API_KEY === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = ORIGINAL_API_KEY;
    }

    if (ORIGINAL_EMAIL_FROM === undefined) {
      delete process.env.EMAIL_FROM;
    } else {
      process.env.EMAIL_FROM = ORIGINAL_EMAIL_FROM;
    }

    vi.restoreAllMocks();
  });

  it("logs a safe skipped outcome when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;

    const result = await sendEmail({
      to: "supplier@example.test",
      subject: "RFQ Invitation: Harbor Package",
      html: "<p>Invite</p>",
      text: "Invite",
    });

    expect(sendMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      skipped: true,
      id: null,
      error: "Email delivery is not configured.",
    });

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith("[email-delivery]", {
      event: "email_delivery",
      provider: "resend",
      status: "skipped",
      attempted: false,
      failure_reason: "not_configured",
      provider_message_id: null,
    });
    expect(console.info).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("logs a safe failure when required email fields are missing", async () => {
    const result = await sendEmail({
      to: "",
      subject: "RFQ Invitation: Harbor Package",
      html: "<p>Invite</p>",
    });

    expect(sendMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      skipped: false,
      id: null,
      error: "Email delivery is missing required fields.",
    });

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith("[email-delivery]", {
      event: "email_delivery",
      provider: "resend",
      status: "failed",
      attempted: false,
      failure_reason: "missing_required_fields",
      provider_message_id: null,
    });
  });

  it("awaits Resend, returns the provider id, and logs a safe sent outcome", async () => {
    sendMock.mockResolvedValue({
      data: { id: "re_test_message_id" },
      error: null,
    });

    const result = await sendEmail({
      to: "supplier@example.test",
      subject: "RFQ Invitation: Harbor Package",
      html: "<p>Invite</p>",
      text: "Invite",
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0]?.[0]).toMatchObject({
      from: "Nexus Pavilion <invites@example.test>",
      to: "supplier@example.test",
      subject: "RFQ Invitation: Harbor Package",
    });

    expect(result).toEqual({
      success: true,
      skipped: false,
      id: "re_test_message_id",
      error: null,
    });

    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.info).toHaveBeenCalledWith("[email-delivery]", {
      event: "email_delivery",
      provider: "resend",
      status: "sent",
      attempted: true,
      failure_reason: null,
      provider_message_id: "re_test_message_id",
    });
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("logs a bounded provider rejection without exposing provider or email data", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: {
        message: "The from address is not verified.",
        recipient: "supplier@example.test",
        token: "private-provider-token",
      },
    });

    const result = await sendEmail({
      to: "supplier@example.test",
      subject: "RFQ Invitation: Harbor Package",
      html: "<p>Invite</p>",
    });

    expect(result.success).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.id).toBeNull();
    expect(result.error).toBe("Email delivery failed.");
    expect(result.error).not.toContain("from address");
    expect(result.error).not.toContain("verified");

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith("[email-delivery]", {
      event: "email_delivery",
      provider: "resend",
      status: "failed",
      attempted: true,
      failure_reason: "provider_rejected",
      provider_message_id: null,
    });

    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);

    expect(logged).not.toContain("supplier@example.test");
    expect(logged).not.toContain("Harbor Package");
    expect(logged).not.toContain("from address");
    expect(logged).not.toContain("verified");
    expect(logged).not.toContain("private-provider-token");
  });

  it("logs a bounded provider exception without exposing exception or email data", async () => {
    sendMock.mockRejectedValue(
      new Error(
        "socket hang up ECONNRESET for supplier@example.test private-provider-token",
      ),
    );

    const result = await sendEmail({
      to: "supplier@example.test",
      subject: "RFQ Invitation: Harbor Package",
      html: "<p>Invite</p>",
    });

    expect(result.success).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.id).toBeNull();
    expect(result.error).toBe("Email delivery could not be completed.");
    expect(result.error).not.toContain("ECONNRESET");
    expect(result.error).not.toContain("socket");

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith("[email-delivery]", {
      event: "email_delivery",
      provider: "resend",
      status: "failed",
      attempted: true,
      failure_reason: "provider_exception",
      provider_message_id: null,
    });

    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);

    expect(logged).not.toContain("supplier@example.test");
    expect(logged).not.toContain("Harbor Package");
    expect(logged).not.toContain("ECONNRESET");
    expect(logged).not.toContain("socket");
    expect(logged).not.toContain("private-provider-token");
  });
});