import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import { formatRfqDeadlineForDisplay } from "@/lib/datetime/format-rfq-deadline-display";

const CANONICAL_UTC = "2026-08-25T02:13:00.000Z";
const TORONTO_DISPLAY = "August 24, 2026 at 10:13 PM America/Toronto";

const modulePath = fileURLToPath(
  new URL("./format-rfq-deadline-display.ts", import.meta.url)
);
const moduleUrl = pathToFileURL(modulePath).href;

describe("formatRfqDeadlineForDisplay", () => {
  it("renders a canonical UTC deadline in America/Toronto", () => {
    expect(
      formatRfqDeadlineForDisplay(CANONICAL_UTC, "America/Toronto")
    ).toBe(TORONTO_DISPLAY);
  });

  it("falls back to America/Toronto when timezone is missing", () => {
    expect(formatRfqDeadlineForDisplay(CANONICAL_UTC, null)).toBe(
      TORONTO_DISPLAY
    );
    expect(formatRfqDeadlineForDisplay(CANONICAL_UTC, undefined)).toBe(
      TORONTO_DISPLAY
    );
    expect(formatRfqDeadlineForDisplay(CANONICAL_UTC, "")).toBe(
      TORONTO_DISPLAY
    );
    expect(formatRfqDeadlineForDisplay(CANONICAL_UTC, "   ")).toBe(
      TORONTO_DISPLAY
    );
  });

  it("falls back to America/Toronto for invalid IANA timezone names", () => {
    expect(formatRfqDeadlineForDisplay(CANONICAL_UTC, "Not/AZone")).toBe(
      TORONTO_DISPLAY
    );
  });

  it("does not depend on the process timezone", () => {
    const script = `
import { formatRfqDeadlineForDisplay } from ${JSON.stringify(moduleUrl)};
process.stdout.write(
  formatRfqDeadlineForDisplay(
    ${JSON.stringify(CANONICAL_UTC)},
    "America/Toronto"
  )
);
`;

    const results = ["UTC", "Pacific/Auckland", "America/Los_Angeles"].map(
      (timeZone) =>
        execFileSync(
          process.execPath,
          ["--experimental-strip-types", "--input-type=module", "-e", script],
          {
            env: { ...process.env, TZ: timeZone },
            encoding: "utf8",
            cwd: path.dirname(modulePath),
          }
        )
    );

    expect(new Set(results).size).toBe(1);
    expect(results[0]).toBe(TORONTO_DISPLAY);
  });

  it("returns the original value when the deadline cannot be parsed", () => {
    expect(formatRfqDeadlineForDisplay("not-a-deadline", "America/Toronto")).toBe(
      "not-a-deadline"
    );
  });

  it("returns N/A for a null or empty deadline", () => {
    expect(formatRfqDeadlineForDisplay(null, "America/Toronto")).toBe("N/A");
    expect(formatRfqDeadlineForDisplay("", "America/Toronto")).toBe("N/A");
  });
});
