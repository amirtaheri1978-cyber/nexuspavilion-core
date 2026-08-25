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

  it("skips the provider when RESEND_API_KEY is missing", async () => {
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
  });

  it("awaits Resend and returns the provider id on success", async () => {
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
  });

  it("does not report success when Resend returns an error", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "The from address is not verified." },
    });

    const result = await sendEmail({
      to: "supplier@example.test",
      subject: "RFQ Invitation: Harbor Package",
      html: "<p>Invite</p>",
    });

    expect(result.success).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.id).toBeNull();
    expect(result.error).toBe("The from address is not verified.");
  });
});
