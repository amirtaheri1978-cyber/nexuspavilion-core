import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const lazySource = readFileSync(
  resolve(
    process.cwd(),
    "src/components/executive/lazy-executive-nexus-guide.tsx",
  ),
  "utf8",
).replace(/\r\n/g, "\n");

const PROP_NAMES = [
  "open",
  "onClose",
  "workflow",
  "readiness",
  "attentionItems",
  "suggestedNextStep",
  "primaryAction",
  "secondaryAction",
  "className",
] as const;

describe("lazy executive nexus guide", () => {
  it("is a client boundary using next/dynamic for ExecutiveNexusGuide", () => {
    expect(lazySource.startsWith('"use client";')).toBe(true);
    expect(lazySource).toContain('import dynamic from "next/dynamic"');
    expect(lazySource).toContain(
      'import("@/components/executive/executive-nexus-guide")',
    );
    expect(lazySource).toContain("mod.ExecutiveNexusGuide");
    expect(lazySource).toContain("ssr: false");
    expect(lazySource).toContain("loading: () => null");
  });

  it("does not statically import ExecutiveNexusGuide at runtime", () => {
    expect(lazySource).not.toContain(
      'import { ExecutiveNexusGuide } from "@/components/executive/executive-nexus-guide"',
    );
    expect(lazySource).not.toContain(
      "import { ExecutiveNexusGuide } from '@/components/executive/executive-nexus-guide'",
    );
    expect(lazySource).not.toMatch(
      /import\s+\{\s*ExecutiveNexusGuide\s*\}\s+from/,
    );
  });

  it("returns null when closed and only renders the dynamic guide when open", () => {
    expect(lazySource).toContain("if (!open) return null;");
    expect(lazySource).toContain("export function LazyExecutiveNexusGuide");
    expect(lazySource).toContain("<ExecutiveNexusGuide");
    expect(lazySource.indexOf("if (!open) return null;")).toBeLessThan(
      lazySource.indexOf("<ExecutiveNexusGuide"),
    );
  });

  it("preserves the ExecutiveNexusGuide presentation prop contract", () => {
    expect(lazySource).toContain("export type LazyExecutiveNexusGuideProps");
    expect(lazySource).toContain("open: boolean");
    expect(lazySource).toContain("onClose: () => void");
    expect(lazySource).toContain("workflow?: string");
    expect(lazySource).toContain("readiness?: string");
    expect(lazySource).toContain("attentionItems?: readonly string[]");
    expect(lazySource).toContain("suggestedNextStep?: string");
    expect(lazySource).toContain("primaryAction?: ReactNode");
    expect(lazySource).toContain("secondaryAction?: ReactNode");
    expect(lazySource).toContain("className?: string");

    for (const prop of PROP_NAMES) {
      expect(lazySource).toContain(`${prop}={${prop}}`);
    }
  });

  it("keeps open state caller-owned with no local state or prefetch", () => {
    expect(lazySource).not.toContain("useState");
    expect(lazySource).not.toContain("useReducer");
    expect(lazySource).not.toContain("useEffect");
    expect(lazySource).not.toContain("requestIdleCallback");
    expect(lazySource).not.toContain("IntersectionObserver");
    expect(lazySource).not.toContain("setTimeout");
    expect(lazySource).not.toContain("setInterval");
    expect(lazySource).not.toContain("prefetch");
    expect(lazySource).not.toContain("preload");
    expect(lazySource).not.toContain("localStorage");
    expect(lazySource).not.toContain("sessionStorage");
    expect(lazySource).not.toContain("cookie");
  });

  it("does not import Ask Nexus business modules or data/AI/page code", () => {
    expect(lazySource).not.toContain("ask-nexus-");
    expect(lazySource).not.toContain("@/lib/ask-nexus");
    expect(lazySource).not.toContain("@/lib/supabase");
    expect(lazySource).not.toContain("createClient");
    expect(lazySource).not.toContain("fetch(");
    expect(lazySource).not.toContain("@/lib/ai");
    expect(lazySource).not.toContain("openai");
    expect(lazySource).not.toContain("useRouter");
    expect(lazySource).not.toContain("next/navigation");
    expect(lazySource).not.toContain("@/app/");
    expect(lazySource).not.toContain("dashboard");
    expect(lazySource).not.toContain("analytics/page");
  });

  it("does not duplicate drawer presentation markup or tokens", () => {
    expect(lazySource).not.toContain("EXECUTIVE_DRAWER_");
    expect(lazySource).not.toContain("<aside");
    expect(lazySource).not.toContain("Nexus Guide");
    expect(lazySource).not.toContain("executive-contract");
    expect(lazySource).not.toContain("overlay");
  });
});
