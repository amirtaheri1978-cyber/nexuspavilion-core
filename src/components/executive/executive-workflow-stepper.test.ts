import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const stepper = readSource(
  "src/components/executive/executive-workflow-stepper.tsx",
);

describe("executive workflow stepper", () => {
  it("renders ordered progress from caller-provided stages", () => {
    expect(stepper).toContain("<nav");
    expect(stepper).toContain('aria-label={label}');
    expect(stepper).toContain("<ol");
    expect(stepper).toContain("<li");
    expect(stepper).toContain('aria-current={current}');
    expect(stepper).toContain('EXECUTIVE_STEPPER_CURRENT');
    expect(stepper).toContain('state === "current"');
    expect(stepper).toContain('aria-hidden="true"');
    expect(stepper).toContain('type="button"');
    expect(stepper).toContain("disabled={step.disabled === true}");
    expect(stepper).toContain("<a href={step.href}");
    expect(stepper.indexOf("!step.disabled && step.href")).toBeLessThan(
      stepper.indexOf('type="button"'),
    );
    expect(stepper).toContain("EXECUTIVE_STEPPER_LIST_HORIZONTAL");
    expect(stepper).toContain("EXECUTIVE_STEPPER_LIST_COMPACT");
    expect(stepper).toContain('case "compact"');
    expect(stepper).not.toContain("pointer-events-none");
    expect(stepper).not.toContain("onKeyDown");
    expect(stepper).not.toContain("tabIndex");
  });

  it("does not encode procurement lifecycle or caller wording", () => {
    expect(stepper).not.toContain("issuer");
    expect(stepper).not.toContain("respondent");
    expect(stepper).not.toContain("rfq");
    expect(stepper).not.toContain("WIZARD_STEPS");
    expect(stepper).not.toContain("quoteCount");
    expect(stepper).not.toContain("setTimeout");
  });
});
