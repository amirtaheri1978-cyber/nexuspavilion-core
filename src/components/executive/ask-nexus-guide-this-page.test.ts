import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  AskNexusGuideThisPage,
  createAskNexusGuideThisPageHelpers,
  normalizeAskNexusGuideSteps,
  type AskNexusGuideStep,
} from "@/components/executive/ask-nexus-guide-this-page";

const guideSource = readFileSync(
  resolve(
    process.cwd(),
    "src/components/executive/ask-nexus-guide-this-page.tsx",
  ),
  "utf8",
).replace(/\r\n/g, "\n");

const sampleSteps: AskNexusGuideStep[] = [
  {
    id: "overview",
    title: "Overview",
    description: "Review the current page context.",
  },
  {
    id: "actions",
    title: "Primary actions",
    description: "Locate the main workflow controls.",
  },
  {
    id: "finish",
    title: "Finish",
    description: "Close the guide when ready.",
  },
];

describe("ask nexus guide this page", () => {
  it("treats null activeStepId as inactive", () => {
    const helpers = createAskNexusGuideThisPageHelpers({
      steps: sampleSteps,
      activeStepId: null,
      onActiveStepChange: vi.fn(),
    });

    expect(helpers.guideActive).toBe(false);
    expect(helpers.activeStepId).toBeNull();
    expect(helpers.isStepActive("overview")).toBe(false);
    expect(helpers.getStepCoachmarkProps("overview")?.open).toBe(false);
  });

  it("starts only through explicit startGuide on the first valid step", () => {
    const onActiveStepChange = vi.fn();
    const helpers = createAskNexusGuideThisPageHelpers({
      steps: [
        { id: " ", title: "Bad", description: "Bad" },
        sampleSteps[0]!,
        sampleSteps[1]!,
      ],
      activeStepId: null,
      onActiveStepChange,
    });

    helpers.startGuide();
    expect(onActiveStepChange).toHaveBeenCalledWith("overview");
    expect(guideSource).not.toContain("useEffect");
    expect(guideSource).not.toContain("startGuide()");
  });

  it("supports replay after close or completion", () => {
    const onActiveStepChange = vi.fn();
    const closed = createAskNexusGuideThisPageHelpers({
      steps: sampleSteps,
      activeStepId: null,
      onActiveStepChange,
    });
    closed.startGuide();
    expect(onActiveStepChange).toHaveBeenLastCalledWith("overview");

    const finished = createAskNexusGuideThisPageHelpers({
      steps: sampleSteps,
      activeStepId: "finish",
      onActiveStepChange,
    });
    finished.nextStep();
    expect(onActiveStepChange).toHaveBeenLastCalledWith(null);

    const replay = createAskNexusGuideThisPageHelpers({
      steps: sampleSteps,
      activeStepId: null,
      onActiveStepChange,
    });
    replay.startGuide();
    expect(onActiveStepChange).toHaveBeenLastCalledWith("overview");
  });

  it("removes empty or invalid steps and preserves first duplicate id", () => {
    expect(
      normalizeAskNexusGuideSteps([
        { id: " ", title: "A", description: "A" },
        { id: "one", title: " ", description: "A" },
        { id: "one", title: "Title", description: " " },
        { id: " one ", title: " First ", description: " Keep " },
        { id: "one", title: "Second", description: "Discard duplicate" },
        { id: "two", title: "Two", description: "Second valid" },
      ]),
    ).toEqual([
      { id: "one", title: "First", description: "Keep" },
      { id: "two", title: "Two", description: "Second valid" },
    ]);
  });

  it("preserves supplied step order", () => {
    expect(
      normalizeAskNexusGuideSteps([
        sampleSteps[2]!,
        sampleSteps[0]!,
        sampleSteps[1]!,
      ]).map((step) => step.id),
    ).toEqual(["finish", "overview", "actions"]);
  });

  it("advances next deterministically and closes on final Finish", () => {
    const onActiveStepChange = vi.fn();

    createAskNexusGuideThisPageHelpers({
      steps: sampleSteps,
      activeStepId: "overview",
      onActiveStepChange,
    }).nextStep();
    expect(onActiveStepChange).toHaveBeenCalledWith("actions");

    createAskNexusGuideThisPageHelpers({
      steps: sampleSteps,
      activeStepId: "actions",
      onActiveStepChange,
    }).nextStep();
    expect(onActiveStepChange).toHaveBeenCalledWith("finish");

    const finalHelpers = createAskNexusGuideThisPageHelpers({
      steps: sampleSteps,
      activeStepId: "finish",
      onActiveStepChange,
    });
    expect(finalHelpers.getStepCoachmarkProps("finish")?.actionLabel).toBe(
      "Finish",
    );
    finalHelpers.nextStep();
    expect(onActiveStepChange).toHaveBeenCalledWith(null);
  });

  it("moves previous safely and keeps first-step previous as a no-op", () => {
    const onActiveStepChange = vi.fn();

    createAskNexusGuideThisPageHelpers({
      steps: sampleSteps,
      activeStepId: "actions",
      onActiveStepChange,
    }).previousStep();
    expect(onActiveStepChange).toHaveBeenCalledWith("overview");

    const firstStepChange = vi.fn();
    createAskNexusGuideThisPageHelpers({
      steps: sampleSteps,
      activeStepId: "overview",
      onActiveStepChange: firstStepChange,
    }).previousStep();
    expect(firstStepChange).not.toHaveBeenCalled();
  });

  it("closes by setting activeStepId null", () => {
    const onActiveStepChange = vi.fn();
    createAskNexusGuideThisPageHelpers({
      steps: sampleSteps,
      activeStepId: "actions",
      onActiveStepChange,
    }).closeGuide();
    expect(onActiveStepChange).toHaveBeenCalledWith(null);
  });

  it("fails safely for unknown activeStepId without inventing a step", () => {
    const onActiveStepChange = vi.fn();
    const helpers = createAskNexusGuideThisPageHelpers({
      steps: sampleSteps,
      activeStepId: "missing",
      onActiveStepChange,
    });

    expect(helpers.guideActive).toBe(false);
    expect(helpers.activeStepId).toBeNull();
    expect(helpers.isStepActive("missing")).toBe(false);
    expect(helpers.getStepCoachmarkProps("overview")?.open).toBe(false);

    helpers.nextStep();
    expect(onActiveStepChange).toHaveBeenCalledWith(null);

    helpers.previousStep();
    expect(onActiveStepChange).toHaveBeenCalledTimes(1);
  });

  it("allows exactly one active step at a time", () => {
    const helpers = createAskNexusGuideThisPageHelpers({
      steps: sampleSteps,
      activeStepId: "actions",
      onActiveStepChange: vi.fn(),
    });

    expect(helpers.isStepActive("overview")).toBe(false);
    expect(helpers.isStepActive("actions")).toBe(true);
    expect(helpers.isStepActive("finish")).toBe(false);
    expect(helpers.getStepCoachmarkProps("overview")?.open).toBe(false);
    expect(helpers.getStepCoachmarkProps("actions")?.open).toBe(true);
    expect(helpers.getStepCoachmarkProps("finish")?.open).toBe(false);
  });

  it("exposes Next/Finish/Close coachmark props for ExecutiveCoachmark", () => {
    const middle = createAskNexusGuideThisPageHelpers({
      steps: sampleSteps,
      activeStepId: "actions",
      onActiveStepChange: vi.fn(),
    }).getStepCoachmarkProps("actions");

    expect(middle).toMatchObject({
      open: true,
      title: "Primary actions",
      description: "Locate the main workflow controls.",
      actionLabel: "Next",
      dismissLabel: "Close",
    });
    expect(typeof middle?.onAction).toBe("function");
    expect(typeof middle?.onDismiss).toBe("function");

    const last = createAskNexusGuideThisPageHelpers({
      steps: sampleSteps,
      activeStepId: "finish",
      onActiveStepChange: vi.fn(),
    }).getStepCoachmarkProps("finish");
    expect(last?.actionLabel).toBe("Finish");
  });

  it("has no auto-start, effects, timers, persistence, or frequency logic", () => {
    expect(guideSource).not.toContain("useEffect");
    expect(guideSource).not.toContain("setTimeout");
    expect(guideSource).not.toContain("setInterval");
    expect(guideSource).not.toContain("localStorage");
    expect(guideSource).not.toContain("sessionStorage");
    expect(guideSource).not.toContain("frequency");
    expect(guideSource).not.toContain("eligibility");
    expect(guideSource).not.toContain("memory");
    expect(guideSource).not.toContain("already seen");
    expect(guideSource).not.toContain("cookie");
  });

  it("has no routing, data, API, or AI access", () => {
    expect(guideSource).not.toContain("next/navigation");
    expect(guideSource).not.toContain("useRouter");
    expect(guideSource).not.toContain("fetch(");
    expect(guideSource).not.toContain("createClient");
    expect(guideSource).not.toContain("openai");
    expect(guideSource).not.toContain("@/lib/ai");
    expect(guideSource).not.toContain("from \"next/");
    expect(guideSource).not.toContain("@/lib/supabase");
  });

  it("does not look up DOM anchors, steal focus, or scroll", () => {
    expect(guideSource).not.toContain("querySelector");
    expect(guideSource).not.toContain("getElementById");
    expect(guideSource).not.toContain("scrollIntoView");
    expect(guideSource).not.toContain("focus(");
    expect(guideSource).not.toContain("createPortal");
    expect(guideSource).not.toContain("cloneElement");
    expect(guideSource).not.toContain("useRef");
  });

  it("reuses ExecutiveCoachmark contract rather than recreating a coachmark", () => {
    expect(guideSource).toContain(
      'from "@/components/executive/executive-coachmark"',
    );
    expect(guideSource).toContain("ExecutiveCoachmark");
    expect(guideSource).toContain("ComponentProps<typeof ExecutiveCoachmark>");
    expect(guideSource).toContain("export function AskNexusGuideThisPage");
    expect(typeof AskNexusGuideThisPage).toBe("function");
    expect(guideSource).not.toContain("EXECUTIVE_POPOVER_SURFACE");
    expect(guideSource).not.toContain("EXECUTIVE_POPOVER_PLACEMENT");
    expect(guideSource).not.toContain("aria-modal");
    expect(guideSource).not.toContain('role="dialog"');
  });
});
