import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  JOB_TITLE_MAX_LENGTH,
  PROFESSIONAL_NAME_MAX_LENGTH,
  buildOwnProfessionalNameWritePayload,
  normalizeJobTitle,
  normalizeProfessionalName,
  readTransitNamesFromMetadata,
  resolveProfessionalNames,
  syncCurrentUserProfessionalNames,
  validateFounderJobTitle,
  validateProfessionalName,
} from "@/lib/auth/professional-names";

type ProfileRow = {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
};

type MockUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

function createMockClient({
  user = {
    id: "user-1",
    email: "founder@example.com",
    user_metadata: {},
  } as MockUser | null,
  profile = null as ProfileRow | null,
  userError = null as { message?: string } | null,
  profileError = null as { message?: string } | null,
  updateError = null as { message?: string } | null,
  insertError = null as { message?: string } | null,
} = {}) {
  const writes: Array<{
    type: "update" | "insert";
    payload: Record<string, unknown>;
  }> = [];

  const client = {
    writes,
    auth: {
      getUser: async () => ({
        data: { user },
        error: userError,
      }),
    },
    from: (table: string) => {
      expect(table).toBe("profiles");

      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: profile,
              error: profileError,
            }),
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          writes.push({ type: "update", payload });
          return {
            eq: async () => ({ error: updateError }),
          };
        },
        insert: async (payload: Record<string, unknown>) => {
          writes.push({ type: "insert", payload });
          return { error: insertError };
        },
      };
    },
  };

  return client as typeof client & SupabaseClient;
}

describe("professional name validation", () => {
  it("trims values and rejects blank names for signup", () => {
    expect(normalizeProfessionalName("  Ada  ")).toBe("Ada");
    expect(
      validateProfessionalName("", "First name", { required: true }),
    ).toBe("First name is required.");
    expect(
      validateProfessionalName("Ada", "First name", { required: true }),
    ).toBeNull();
  });

  it("enforces the 80-character professional name maximum", () => {
    const tooLong = "A".repeat(PROFESSIONAL_NAME_MAX_LENGTH + 1);

    expect(
      validateProfessionalName(tooLong, "First name", { required: true }),
    ).toBe("First name must not exceed 80 characters.");
    expect(
      validateProfessionalName(
        "A".repeat(PROFESSIONAL_NAME_MAX_LENGTH),
        "Last name",
        { required: true },
      ),
    ).toBeNull();
  });

  it("enforces the 120-character founder job title maximum", () => {
    expect(normalizeJobTitle("  Director  ")).toBe("Director");
    expect(
      validateFounderJobTitle("", { required: true }),
    ).toBe("Job title is required.");
    expect(
      validateFounderJobTitle("B".repeat(JOB_TITLE_MAX_LENGTH + 1), {
        required: false,
      }),
    ).toBe("Job title must not exceed 120 characters.");
    expect(
      validateFounderJobTitle("B".repeat(JOB_TITLE_MAX_LENGTH), {
        required: true,
      }),
    ).toBeNull();
  });
});

describe("professional name resolution", () => {
  it("uses metadata only when profile names are missing", () => {
    const transit = readTransitNamesFromMetadata({
      first_name: " Ada ",
      last_name: " Lovelace ",
    });

    expect(transit).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
    });

    expect(
      resolveProfessionalNames({
        storedFirstName: null,
        storedLastName: null,
        metadataFirstName: transit.firstName,
        metadataLastName: transit.lastName,
      }),
    ).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
    });
  });

  it("does not overwrite stored names with blank input or metadata", () => {
    expect(
      resolveProfessionalNames({
        storedFirstName: "Grace",
        storedLastName: "Hopper",
        inputFirstName: "",
        inputLastName: "   ",
        metadataFirstName: "Ada",
        metadataLastName: "Lovelace",
      }),
    ).toEqual({
      firstName: "Grace",
      lastName: "Hopper",
    });

    expect(
      resolveProfessionalNames({
        storedFirstName: "Grace",
        storedLastName: "Hopper",
        metadataFirstName: "Ada",
        metadataLastName: "Lovelace",
      }),
    ).toEqual({
      firstName: "Grace",
      lastName: "Hopper",
    });
  });

  it("never includes company_id or role in the own-name write payload", () => {
    const payload = buildOwnProfessionalNameWritePayload({
      resolved: { firstName: "Ada", lastName: "Lovelace" },
      storedFirstName: null,
      storedLastName: null,
    });

    expect(payload).toEqual({
      first_name: "Ada",
      last_name: "Lovelace",
    });
    expect(payload).not.toHaveProperty("company_id");
    expect(payload).not.toHaveProperty("role");
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("id");
  });
});

describe("syncCurrentUserProfessionalNames", () => {
  it("writes only own first_name and last_name", async () => {
    const client = createMockClient({
      user: {
        id: "user-1",
        user_metadata: { first_name: "Ada", last_name: "Lovelace" },
      },
      profile: { id: "user-1", first_name: null, last_name: null },
    });

    const result = await syncCurrentUserProfessionalNames(client, {
      requireNames: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.wrote).toBe(true);
    expect(client.writes).toHaveLength(1);
    expect(client.writes[0]?.type).toBe("update");
    expect(client.writes[0]?.payload).toEqual({
      first_name: "Ada",
      last_name: "Lovelace",
    });
    expect(client.writes[0]?.payload).not.toHaveProperty("company_id");
    expect(client.writes[0]?.payload).not.toHaveProperty("role");
  });

  it("does not write null or blank over stored profile names", async () => {
    const client = createMockClient({
      user: {
        id: "user-1",
        user_metadata: { first_name: "", last_name: null },
      },
      profile: {
        id: "user-1",
        first_name: "Grace",
        last_name: "Hopper",
      },
    });

    const result = await syncCurrentUserProfessionalNames(client, {
      firstName: "   ",
      lastName: "",
      requireNames: false,
    });

    expect(result).toMatchObject({
      ok: true,
      wrote: false,
      firstName: "Grace",
      lastName: "Hopper",
    });
    expect(client.writes).toHaveLength(0);
  });

  it("lets existing null-name users continue without a mandatory name write", async () => {
    const client = createMockClient({
      user: { id: "legacy-user", user_metadata: {} },
      profile: { id: "legacy-user", first_name: null, last_name: null },
    });

    const result = await syncCurrentUserProfessionalNames(client, {
      requireNames: false,
    });

    expect(result).toMatchObject({
      ok: true,
      wrote: false,
      firstName: null,
      lastName: null,
    });
    expect(client.writes).toHaveLength(0);
  });
});
