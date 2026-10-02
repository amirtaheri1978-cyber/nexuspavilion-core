import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const workspace = readSource(
  "src/components/rfq-workspace/rfq-rfi-workspace.tsx",
);

describe("RFI submitted completion moment", () => {
  it("confirms a submitted RFI from the returned record without changing submit behavior", () => {
    const submit = workspace.indexOf("async function handleSubmitQuestion");
    const answer = workspace.indexOf("async function handleAnswerRfi");
    const completion = workspace.indexOf("<ExecutiveCompletionMoment");

    expect(submit).toBeGreaterThan(-1);
    expect(answer).toBeGreaterThan(submit);
    expect(completion).toBeGreaterThan(answer);
    expect(workspace).toContain('fetch("/api/rfq-rfis"');
    expect(workspace).toContain('method: "POST"');
    expect(workspace).toContain("question: question.trim()");
    expect(workspace).toContain("setRfis((current) => [data.rfi, ...current])");
    expect(workspace).toContain("if (isSubmittedRfi(data.rfi))");
    expect(workspace).toContain('title="Private RFI submitted."');
    expect(workspace).toContain("summary={submissionStateSummary(submittedRfi)}");
    expect(workspace).toContain("Submitted ${formatTimestamp(rfi.created_at)}");
    expect(workspace).toContain("displayedRfiStatus(rfi.status)");
    expect(workspace).toContain('state="confirmed"');
    expect(workspace).toContain('setMessage("Private RFI answered.")');
    expect(workspace).not.toContain("nextAction=");
    expect(workspace).not.toContain("router.push");
    expect(workspace).not.toContain("href=");
  });
});
