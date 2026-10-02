import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const completion = readSource(
  "src/components/executive/executive-completion-moment.tsx",
);
const progress = readSource("src/components/executive/executive-progress.tsx");
const contract = readSource("src/lib/design-system/executive-contract.ts");

describe("executive completion moment", () => {
  it("presents processing, confirmation, summary, and caller actions", () => {
    const processing = completion.indexOf('case "processing"');
    const confirmed = completion.indexOf('case "confirmed"');
    const summary = completion.indexOf("hasText(summary)");
    const progressBar = completion.indexOf("<ExecutiveProgress");
    const nextAction = completion.lastIndexOf("nextAction");
    const secondary = completion.lastIndexOf("secondaryAction");

    expect(processing).toBeGreaterThan(-1);
    expect(confirmed).toBeGreaterThan(processing);
    expect(summary).toBeGreaterThan(-1);
    expect(progressBar).toBeGreaterThan(summary);
    expect(nextAction).toBeGreaterThan(progressBar);
    expect(secondary).toBeGreaterThan(nextAction);
    expect(completion).toContain('role="status"');
    expect(completion).toContain("aria-busy={presentation.busy}");
    expect(completion).toContain("aria-live={presentation.live}");
    expect(completion).toContain("EXECUTIVE_FEEDBACK_INFO");
    expect(completion).toContain("EXECUTIVE_FEEDBACK_SUCCESS");
    expect(completion).toContain("EXECUTIVE_LOADING_LIVE");
    expect(completion).toContain("EXECUTIVE_FEEDBACK_LIVE.success");
    expect(completion).toContain('state === "processing" && Number.isFinite(progress)');
    expect(completion).toContain("hasAction(nextAction)");
    expect(completion).toContain("hasAction(secondaryAction)");
    expect(completion).toContain("hasText(detail)");
    expect(progress).toContain("EXECUTIVE_PROGRESS_VALUE");
    expect(contract).toContain(
      '"transition-[width] duration-[var(--motion-duration-context)]"',
    );
    expect(contract).toContain('"motion-reduce:transition-none"');
  });

  it("does not own workflow, navigation, or async behavior", () => {
    expect(completion).not.toContain("onClick");
    expect(completion).not.toContain("href=");
    expect(completion).not.toContain("<button");
    expect(completion).not.toContain("<a ");
    expect(completion).not.toContain("tabIndex");
    expect(completion).not.toContain("onKeyDown");
    expect(completion).not.toContain("fetch(");
    expect(completion).not.toContain("useRouter");
    expect(completion).not.toContain("setTimeout");
    expect(completion).not.toContain("animate-");
    expect(completion).not.toContain("confetti");
    expect(completion).not.toContain("rfq");
    expect(completion).not.toContain("award");
    expect(completion).not.toContain("membership");
  });

  it("keeps completion feedback available without motion", () => {
    expect(completion).toContain("{title}");
    expect(completion).toContain("{summary}");
    expect(completion).toContain("{detail}");
    expect(completion).toContain("{nextAction}");
    expect(completion).toContain("{secondaryAction}");
    expect(completion).toContain('role="status"');
    expect(completion).toContain('case "processing"');
    expect(completion).toContain('case "confirmed"');
    expect(completion).not.toContain(["np", "attention"].join("-"));
    expect(completion).not.toContain(["np", "motion", "fade"].join("-"));
    expect(completion).not.toContain("@keyframes");
    expect(completion).not.toContain("prefers-reduced-motion");
    expect(completion).not.toContain("matchMedia");
    expect(completion).not.toContain("requestAnimationFrame");
  });
});
