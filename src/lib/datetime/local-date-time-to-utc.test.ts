import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  localDateTimeToUtcIso,
  resolveRfqDeadlineForStorage,
} from "./local-date-time-to-utc.ts";

const UTILITY_PATH = fileURLToPath(
  new URL("./local-date-time-to-utc.ts", import.meta.url)
);

describe("localDateTimeToUtcIso", () => {
  it("converts Toronto summer local time to UTC", () => {
    assert.equal(
      localDateTimeToUtcIso("2026-08-24", "15:15", "America/Toronto"),
      "2026-08-24T19:15:00.000Z"
    );
  });

  it("converts Toronto winter local time to UTC", () => {
    assert.equal(
      localDateTimeToUtcIso("2026-01-24", "15:15", "America/Toronto"),
      "2026-01-24T20:15:00.000Z"
    );
  });

  it("does not depend on the machine or server timezone", () => {
    const probe = `
import { localDateTimeToUtcIso } from ${JSON.stringify(UTILITY_PATH)};
process.stdout.write(localDateTimeToUtcIso("2026-08-24", "15:15", "America/Toronto"));
`;

    const results = ["UTC", "Pacific/Auckland", "America/Los_Angeles"].map(
      (timeZone) =>
        execFileSync(
          process.execPath,
          ["--experimental-strip-types", "--input-type=module", "-e", probe],
          {
            env: { ...process.env, TZ: timeZone },
            encoding: "utf8",
            cwd: path.dirname(UTILITY_PATH),
          }
        )
    );

    assert.equal(new Set(results).size, 1);
    assert.equal(results[0], "2026-08-24T19:15:00.000Z");
  });
});

describe("resolveRfqDeadlineForStorage", () => {
  it("stores the canonical UTC deadline for RFQ creation", () => {
    const stored = resolveRfqDeadlineForStorage({
      deadline: "2026-08-24T15:15",
      deadline_timezone: "America/Toronto",
    });

    assert.equal(stored.deadline, "2026-08-24T19:15:00.000Z");
    assert.equal(stored.deadline_timezone, "America/Toronto");
  });
});
