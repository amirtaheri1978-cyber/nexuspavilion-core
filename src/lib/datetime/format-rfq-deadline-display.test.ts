import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import { formatRfqDeadlineForDisplay } from "@/lib/datetime/format-rfq-deadline-display";
import { resolveRfqDeadlineForStorage } from "@/lib/datetime/local-date-time-to-utc";

const CANONICAL_UTC = "2026-08-25T02:13:00.000Z";
const TORONTO_DISPLAY = "August 24, 2026 at 10:13 PM America/Toronto";
const PREVIEW_LOCAL = "2026-12-15T14:30";
const PREVIEW_UTC = "2026-12-15T19:30:00.000Z";
const PREVIEW_DISPLAY = "December 15, 2026 at 02:30 PM America/Toronto";

const modulePath = fileURLToPath(
  new URL("./format-rfq-deadline-display.ts", import.meta.url)
);
const moduleUrl = pathToFileURL(modulePath).href;
const storageModulePath = fileURLToPath(
  new URL("./local-date-time-to-utc.ts", import.meta.url)
);
const storageModuleUrl = pathToFileURL(storageModulePath).href;

function readSource(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

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

  it("round-trips a naive RFQ creation deadline through storage and display", () => {
    const resolved = resolveRfqDeadlineForStorage({
      deadline: PREVIEW_LOCAL,
      deadline_timezone: "America/Toronto",
    });

    expect(resolved).toEqual({
      deadline: PREVIEW_UTC,
      deadline_timezone: "America/Toronto",
    });
    expect(
      formatRfqDeadlineForDisplay(
        resolved.deadline,
        resolved.deadline_timezone,
      ),
    ).toBe(PREVIEW_DISPLAY);
  });

  it("keeps the storage-to-display round-trip independent of process timezone", () => {
    const script = `
import { resolveRfqDeadlineForStorage } from ${JSON.stringify(storageModuleUrl)};
import { formatRfqDeadlineForDisplay } from ${JSON.stringify(moduleUrl)};
const resolved = resolveRfqDeadlineForStorage({
  deadline: ${JSON.stringify(PREVIEW_LOCAL)},
  deadline_timezone: "America/Toronto",
});
process.stdout.write(
  JSON.stringify({
    deadline: resolved.deadline,
    display: formatRfqDeadlineForDisplay(
      resolved.deadline,
      resolved.deadline_timezone,
    ),
  })
);
`;

    const results = ["UTC", "Pacific/Auckland", "America/Los_Angeles"].map(
      (timeZone) =>
        JSON.parse(
          execFileSync(
            process.execPath,
            ["--experimental-strip-types", "--input-type=module", "-e", script],
            {
              env: { ...process.env, TZ: timeZone },
              encoding: "utf8",
              cwd: path.dirname(modulePath),
            },
          ),
        ),
    );

    for (const result of results) {
      expect(result.deadline).toBe(PREVIEW_UTC);
      expect(result.display).toBe(PREVIEW_DISPLAY);
    }
  });
});

describe("RFQ new deadline preview contract", () => {
  const rfqNewPage = readSource("src/app/rfq/new/page.tsx");

  it("previews deadlines through resolveRfqDeadlineForStorage and formatRfqDeadlineForDisplay", () => {
    expect(rfqNewPage).toContain(
      'from "@/lib/datetime/local-date-time-to-utc"',
    );
    expect(rfqNewPage).toContain(
      'from "@/lib/datetime/format-rfq-deadline-display"',
    );
    expect(rfqNewPage).toContain("resolveRfqDeadlineForStorage({");
    expect(rfqNewPage).toContain("formatRfqDeadlineForDisplay(");
    expect(rfqNewPage).not.toContain('date.toLocaleString("en-CA"');
    expect(rfqNewPage).not.toContain("const date = new Date(value);");
  });
});
