import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: vi.fn(),
}));

import { POST as postContact } from "@/app/api/contact/route";
import { sendEmail } from "@/lib/email/send-email";

const sendEmailMock = vi.mocked(sendEmail);
const ORIGINAL_CONTACT_EMAIL = process.env.CONTACT_EMAIL;

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

function contactRequest(overrides: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Jane Operator",
      email: "jane@example.test",
      company: "Harbor Co",
      inquiryType: "General Inquiry",
      message:
        "Please contact us about a procurement workspace evaluation.",
      website: "",
      ...overrides,
    }),
  });
}

describe("integration configuration boundaries", () => {
  beforeEach(() => {
    sendEmailMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (ORIGINAL_CONTACT_EMAIL === undefined) {
      delete process.env.CONTACT_EMAIL;
    } else {
      process.env.CONTACT_EMAIL = ORIGINAL_CONTACT_EMAIL;
    }

    vi.restoreAllMocks();
  });

  it("removes the deprecated Supabase singleton after zero live consumers", () => {
    expect(existsSync(resolve(process.cwd(), "src/lib/supabase.ts"))).toBe(
      false,
    );
    expect(existsSync(resolve(process.cwd(), "src/lib/supabase/server.ts"))).toBe(
      true,
    );
    expect(existsSync(resolve(process.cwd(), "src/lib/supabase/client.ts"))).toBe(
      true,
    );
  });

  it("routes production pages through getPublicSiteUrl instead of a direct env read", () => {
    const settings = readSource("src/app/company/settings/page.tsx");
    const company = readSource("src/app/company/page.tsx");
    const forgotPassword = readSource("src/app/forgot-password/page.tsx");

    expect(settings).toContain("getPublicSiteUrl()");
    expect(settings).not.toContain("process.env.NEXT_PUBLIC_SITE_URL");
    expect(company).toContain("getPublicSiteUrl()");
    expect(company).not.toContain("process.env.NEXT_PUBLIC_SITE_URL");
    expect(forgotPassword).toContain("getPublicSiteUrl()");
    expect(forgotPassword).toContain("window.location.origin");
    expect(forgotPassword).not.toContain("process.env.NEXT_PUBLIC_SITE_URL");
  });

  it("keeps CONTACT_EMAIL environment-driven with no hardcoded fallback", () => {
    const contactRoute = readSource("src/app/api/contact/route.ts");

    expect(contactRoute).toContain("process.env.CONTACT_EMAIL?.trim()");
    expect(contactRoute).not.toContain("a.mirtaheri1978@gmail.com");
    expect(contactRoute).not.toContain("|| \"a.mirtaheri");
    expect(contactRoute).not.toContain("message: emailResult.error");
    expect(contactRoute).toContain("Unable to send the contact request.");
  });

  it("returns HTTP 503 before sendEmail when CONTACT_EMAIL is missing or blank", async () => {
    delete process.env.CONTACT_EMAIL;

    const missingResponse = await postContact(contactRequest());
    const missingBody = (await missingResponse.json()) as {
      success?: boolean;
      message?: string;
    };

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(missingResponse.status).toBe(503);
    expect(missingBody.success).toBe(false);
    expect(missingBody.message).toBe(
      "Contact request received, but email delivery is not configured.",
    );

    process.env.CONTACT_EMAIL = "   ";

    const blankResponse = await postContact(contactRequest());

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(blankResponse.status).toBe(503);
  });

  it("does not return raw provider errors from the public contact API", async () => {
    process.env.CONTACT_EMAIL = "ops@example.test";
    sendEmailMock.mockResolvedValue({
      success: false,
      skipped: false,
      id: null,
      error: "The from address is not verified.",
    });

    const response = await postContact(contactRequest());
    const body = (await response.json()) as {
      success?: boolean;
      message?: string;
    };
    const serialized = JSON.stringify(body);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Unable to send the contact request.");
    expect(serialized).not.toContain("The from address is not verified.");
    expect(serialized).not.toContain("emailResult.error");
  });

  it("keeps Workspace Invitation presentation free of Resend provider details", () => {
    const inviteForm = readSource("src/components/invite-user-form.tsx");

    expect(inviteForm).not.toContain("Resend Email ID");
    expect(inviteForm).not.toContain("emailResult.id");
    expect(inviteForm).not.toContain("${emailResult.error}");
    expect(inviteForm).toContain("Workspace Invitation Sent");
    expect(inviteForm).toContain("Email Delivery Skipped");
    expect(inviteForm).toContain("Email Delivery Failed");
    expect(inviteForm).toContain("workspace invitation link");
    expect(inviteForm).toContain(
      "Workspace membership is separate from RFQ invitations",
    );
  });
});
