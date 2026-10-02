import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { AskNexusAuthorizedContext } from "@/lib/ask-nexus/ask-nexus-context";
import { resolveAskNexusSuggestedQuestions } from "@/lib/ask-nexus/ask-nexus-suggested-questions";

const questionsSource = readFileSync(
  resolve(process.cwd(), "src/lib/ask-nexus/ask-nexus-suggested-questions.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

function emptyContext(
  overrides: Partial<AskNexusAuthorizedContext> = {},
): AskNexusAuthorizedContext {
  return {
    pageLabel: null,
    workflowLabel: null,
    company: null,
    project: null,
    rfq: null,
    facts: [],
    authorizedDomains: [],
    ...overrides,
  };
}

describe("ask nexus suggested questions", () => {
  it("enables the next-step question from page or workflow labels", () => {
    expect(
      resolveAskNexusSuggestedQuestions(
        emptyContext({ pageLabel: "Procurement Center" }),
      ).map((question) => question.id),
    ).toEqual(["next-step"]);

    expect(
      resolveAskNexusSuggestedQuestions(
        emptyContext({ workflowLabel: "Quote submission" }),
      ),
    ).toEqual([
      {
        id: "next-step",
        label: "What should I do next?",
        intent: "next_step",
      },
    ]);
  });

  it("enables change and incomplete questions when facts are present", () => {
    const result = resolveAskNexusSuggestedQuestions(
      emptyContext({
        facts: [{ key: "status", label: "Status", value: "Open" }],
      }),
    );

    expect(result.map((question) => question.intent)).toEqual([
      "change",
      "incomplete",
    ]);
    expect(result.map((question) => question.label)).toEqual([
      "What changed?",
      "What is incomplete?",
    ]);
  });

  it("enables an RFQ explain question when RFQ context exists", () => {
    const result = resolveAskNexusSuggestedQuestions(
      emptyContext({
        rfq: {
          id: "rfq-1",
          label: "Harbor Point",
          authorizedHref: "/rfq/harbor-point",
        },
      }),
    );

    expect(result).toEqual([
      {
        id: "explain-rfq",
        label: "Explain this RFQ.",
        intent: "explain",
      },
    ]);
  });

  it("enables project explain only when RFQ explain is unavailable", () => {
    expect(
      resolveAskNexusSuggestedQuestions(
        emptyContext({
          project: { id: "project-1", label: "Campus" },
        }),
      ),
    ).toEqual([
      {
        id: "explain-project",
        label: "Explain this project.",
        intent: "explain",
      },
    ]);

    const withRfq = resolveAskNexusSuggestedQuestions(
      emptyContext({
        project: { id: "project-1", label: "Campus" },
        rfq: {
          id: "rfq-1",
          label: "Package",
          authorizedHref: null,
        },
      }),
    );

    expect(withRfq.map((question) => question.id)).toEqual(["explain-rfq"]);
    expect(withRfq.some((question) => question.id === "explain-project")).toBe(
      false,
    );
  });

  it("enables company explain only when no more-specific explain resource exists", () => {
    expect(
      resolveAskNexusSuggestedQuestions(
        emptyContext({
          company: { id: "company-1", label: "Northline" },
        }),
      ),
    ).toEqual([
      {
        id: "explain-company",
        label: "Explain this company.",
        intent: "explain",
      },
    ]);

    const withProject = resolveAskNexusSuggestedQuestions(
      emptyContext({
        company: { id: "company-1", label: "Northline" },
        project: { id: "project-1", label: "Campus" },
      }),
    );
    expect(withProject.map((question) => question.id)).toEqual([
      "explain-project",
    ]);

    const withRfq = resolveAskNexusSuggestedQuestions(
      emptyContext({
        company: { id: "company-1", label: "Northline" },
        project: { id: "project-1", label: "Campus" },
        rfq: {
          id: "rfq-1",
          label: "Package",
          authorizedHref: null,
        },
      }),
    );
    expect(withRfq.map((question) => question.id)).toEqual(["explain-rfq"]);
  });

  it("does not generate questions for null unauthorized resources", () => {
    const result = resolveAskNexusSuggestedQuestions(
      emptyContext({
        authorizedDomains: ["company", "project", "rfq"],
      }),
    );

    expect(result).toEqual([]);
  });

  it("returns an empty list for empty context", () => {
    expect(resolveAskNexusSuggestedQuestions(emptyContext())).toEqual([]);
  });

  it("enforces a maximum of 4 questions with stable deterministic ordering", () => {
    const result = resolveAskNexusSuggestedQuestions(
      emptyContext({
        pageLabel: "RFQ Workspace",
        workflowLabel: "Evaluation",
        company: { id: "company-1", label: "Northline" },
        project: { id: "project-1", label: "Campus" },
        rfq: {
          id: "rfq-1",
          label: "Package",
          authorizedHref: "/rfq/package",
        },
        facts: [
          { key: "a", label: "A", value: "1" },
          { key: "b", label: "B", value: "2" },
        ],
        authorizedDomains: ["company", "project", "rfq"],
      }),
    );

    expect(result).toHaveLength(4);
    expect(result.map((question) => question.intent)).toEqual([
      "next_step",
      "change",
      "incomplete",
      "explain",
    ]);
    expect(result.map((question) => question.id)).toEqual([
      "next-step",
      "what-changed",
      "what-is-incomplete",
      "explain-rfq",
    ]);

    const again = resolveAskNexusSuggestedQuestions(
      emptyContext({
        pageLabel: "RFQ Workspace",
        facts: [{ key: "a", label: "A", value: "1" }],
        rfq: {
          id: "rfq-1",
          label: "Package",
          authorizedHref: null,
        },
      }),
    );
    expect(again.map((question) => question.id)).toEqual([
      "next-step",
      "what-changed",
      "what-is-incomplete",
      "explain-rfq",
    ]);
  });

  it("keeps suggested question IDs unique", () => {
    const result = resolveAskNexusSuggestedQuestions(
      emptyContext({
        pageLabel: "Dashboard",
        facts: [{ key: "x", label: "X", value: "1" }],
        company: { id: "company-1", label: "Northline" },
      }),
    );

    const ids = result.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not parse fact values for business meaning", () => {
    const result = resolveAskNexusSuggestedQuestions(
      emptyContext({
        facts: [
          {
            key: "risk",
            label: "Risk",
            value: "award ready high risk submit now",
          },
        ],
      }),
    );

    expect(result.map((question) => question.label)).toEqual([
      "What changed?",
      "What is incomplete?",
    ]);
    expect(questionsSource).not.toContain("fact.value");
    expect(questionsSource).not.toContain("facts.map");
    expect(questionsSource).not.toContain("includes(");
    expect(questionsSource).not.toContain("match(");
    expect(questionsSource).toContain("context.facts.length > 0");
  });

  it("does not parse labels for domain or permission meaning", () => {
    const result = resolveAskNexusSuggestedQuestions(
      emptyContext({
        pageLabel: "Award Decision Room",
        workflowLabel: "Submit Quote",
      }),
    );

    expect(result).toEqual([
      {
        id: "next-step",
        label: "What should I do next?",
        intent: "next_step",
      },
    ]);
    expect(questionsSource).not.toContain("pageLabel.includes");
    expect(questionsSource).not.toContain("workflowLabel.includes");
    expect(questionsSource).not.toContain("toLowerCase(");
  });

  it("avoids consequential-action wording", () => {
    const labels = [
      ...resolveAskNexusSuggestedQuestions(
        emptyContext({
          pageLabel: "Workspace",
          facts: [{ key: "a", label: "A", value: "1" }],
          rfq: {
            id: "rfq-1",
            label: "Package",
            authorizedHref: null,
          },
        }),
      ).map((question) => question.label.toLowerCase()),
      questionsSource.toLowerCase(),
    ].join("\n");

    for (const phrase of [
      "recommend an award",
      "submit for me",
      "publish",
      "approve",
      "award",
    ]) {
      expect(labels).not.toContain(phrase);
    }
  });

  it("contains no API, data, router, or AI imports", () => {
    expect(questionsSource).not.toContain("from \"@/lib/supabase");
    expect(questionsSource).not.toContain("createClient");
    expect(questionsSource).not.toContain("fetch(");
    expect(questionsSource).not.toContain("next/navigation");
    expect(questionsSource).not.toContain("useRouter");
    expect(questionsSource).not.toContain("openai");
    expect(questionsSource).not.toContain("@/lib/ai");
    expect(questionsSource).not.toContain("from \"next/");
  });

  it("contains no permission or role logic", () => {
    expect(questionsSource).not.toContain("permissionGranted");
    expect(questionsSource).not.toContain("procurement_function");
    expect(questionsSource).not.toContain("procurementFunction");
    expect(questionsSource).not.toContain("workspace-permissions");
    expect(questionsSource).not.toContain("procurement-write-authorization");
    expect(questionsSource).not.toMatch(/\brole\b/);
    expect(questionsSource).not.toContain("canAward");
    expect(questionsSource).not.toContain("canSubmit");
  });

  it("reuses the authorized context type without duplicating the contract", () => {
    expect(questionsSource).toContain(
      'from "@/lib/ask-nexus/ask-nexus-context"',
    );
    expect(questionsSource).toContain("AskNexusAuthorizedContext");
    expect(questionsSource).not.toContain("authorizedDomains?:");
    expect(questionsSource).not.toContain("type AskNexusAuthorizedContext =");
  });

  it("does not synthesize routes", () => {
    expect(questionsSource).not.toContain('"/rfq/');
    expect(questionsSource).not.toContain("'/rfq/");
    expect(questionsSource).not.toContain("`/rfq/");
    expect(questionsSource).not.toContain("authorizedHref");
    expect(questionsSource).not.toContain("encodeURIComponent");
  });
});
