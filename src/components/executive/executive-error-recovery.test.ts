import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

function sourceFiles(relativeDir: string): string[] {
  const entries = readdirSync(resolve(process.cwd(), relativeDir), {
    withFileTypes: true,
  });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = `${relativeDir}/${entry.name}`;

    if (entry.isDirectory()) {
      files.push(...sourceFiles(relativePath));
      continue;
    }

    if (!/\.(tsx|ts|css)$/.test(entry.name)) continue;

    files.push(relativePath);
  }

  return files;
}

const recovery = readSource(
  "src/components/executive/executive-error-recovery.tsx",
);
const contract = readSource("src/lib/design-system/executive-contract.ts");
const globals = readSource("src/app/globals.css");

const ownedFiles = new Set([
  "src/components/executive/executive-error-recovery.tsx",
  "src/components/executive/executive-error-recovery.test.ts",
  "src/app/globals.css",
  "src/lib/design-system/executive-contract.ts",
]);

describe("executive error recovery", () => {
  it("reuses the shared error surface and caller-owned recovery", () => {
    expect(recovery).toContain("export function ExecutiveErrorRecovery");
    expect(recovery).toContain("EXECUTIVE_ERROR_SURFACE");
    expect(recovery).toContain("EXECUTIVE_ERROR_PROBLEM");
    expect(recovery).toContain("EXECUTIVE_ERROR_IMPACT");
    expect(recovery).toContain("EXECUTIVE_ERROR_ROLE");
    expect(recovery).toContain("EXECUTIVE_ERROR_LIVE");
    expect(recovery).toContain("EXECUTIVE_ERROR_HIGHLIGHT_CLASS");
    expect(recovery).toContain("hasText(impact)");
    expect(recovery).toContain("hasText(recovery)");
    expect(recovery).toContain("hasAction(recoveryAction)");
    expect(contract).toContain(
      "export const EXECUTIVE_ERROR_SURFACE = EXECUTIVE_FEEDBACK_ERROR",
    );
    expect(contract).toContain(
      'export const EXECUTIVE_ERROR_HIGHLIGHT_CLASS = "np-error-recovery"',
    );
    expect(contract).not.toContain("function ExecutiveError");
  });

  it("moves focus only to a caller-provided recovery target", () => {
    const guard = recovery.indexOf("if (!active) return;");
    const focus = recovery.indexOf("recoveryTargetRef?.current?.focus()");

    expect(guard).toBeGreaterThan(-1);
    expect(focus).toBeGreaterThan(guard);
    expect(recovery).toContain("if (!active) return null;");
    expect(recovery.match(/\.focus\(/g)).toHaveLength(1);
    expect(recovery).not.toContain("document.");
    expect(recovery).not.toContain("querySelector");
    expect(recovery).not.toContain("tabIndex");
  });

  it("does not own navigation, requests, or timed behavior", () => {
    expect(recovery).not.toContain("fetch(");
    expect(recovery).not.toContain("useRouter");
    expect(recovery).not.toContain("router.");
    expect(recovery).not.toContain("href=");
    expect(recovery).not.toContain("onClick");
    expect(recovery).not.toContain("<button");
    expect(recovery).not.toContain("<a ");
    expect(recovery).not.toContain("setTimeout");
    expect(recovery).not.toContain("setInterval");
  });

  it("highlights the error once and keeps reduced motion on the global rule", () => {
    const highlight = globals.slice(globals.indexOf(".np-error-recovery {"));

    expect(highlight).toContain(
      "animation-name: np-error-recovery-wash, np-error-recovery-edge;",
    );
    expect(highlight).toContain("animation-iteration-count: 1, 1;");
    expect(highlight).toContain("animation-fill-mode: none, none;");
    expect(highlight).toContain("var(--motion-duration-context)");
    expect(highlight).toContain("var(--motion-duration-milestone)");
    expect(highlight).toContain("var(--motion-ease-standard)");
    expect(highlight).toContain("var(--status-risk)");
    expect(highlight).toContain("background-color: transparent;");
    expect(highlight).not.toContain("infinite");
    expect(highlight).not.toContain("shake");
    expect(highlight).not.toContain("bounce");
    expect(highlight).not.toContain("scale");
    expect(highlight).not.toContain("confetti");
    expect(highlight).not.toContain("prefers-reduced-motion");
    expect(globals).toContain("animation-name: none !important;");
    expect(globals).toContain("@media (prefers-reduced-motion: reduce)");
    expect(cssUnchanged(globals, "--motion-duration-milestone")).toBe("650ms");
    expect(cssUnchanged(globals, "--motion-ease-standard")).toBe(
      "cubic-bezier(0.2, 0, 0, 1)",
    );
  });

  it("is not mounted from product pages or other components", () => {
    for (const file of [
      ...sourceFiles("src/app"),
      ...sourceFiles("src/components"),
    ]) {
      if (ownedFiles.has(file)) continue;

      const source = readSource(file);
      expect(source, file).not.toContain("ExecutiveErrorRecovery");
      expect(source, file).not.toContain("np-error-recovery");
    }
  });
});

function cssUnchanged(source: string, name: string) {
  const match = source.match(new RegExp(`${name}:\\s*([^;]+);`));
  return match?.[1] ?? "";
}
