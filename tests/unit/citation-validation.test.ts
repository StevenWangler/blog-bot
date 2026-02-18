import { describe, expect, it } from "vitest";
import { validatePostCitations } from "../../src/services/content-generator.js";

describe("validatePostCitations", () => {
  it("accepts valid inline citations and sources section", () => {
    const markdown = `AI teams should track cycle time [1]. Benchmark drift can be measured weekly [2].\n\n## Sources\n[1] Report A https://example.com/a\n[2] Report B https://example.com/b`;
    const result = validatePostCitations(markdown, 3);
    expect(result.ok).toBe(true);
  });

  it("rejects missing sources section", () => {
    const markdown = "AI teams should track cycle time [1].";
    const result = validatePostCitations(markdown, 3);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("Missing '## Sources' section");
  });

  it("rejects factual sentence without citation", () => {
    const markdown = `A 42 percent improvement was observed.\n\n## Sources\n[1] Report A https://example.com/a`;
    const result = validatePostCitations(markdown, 1);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("Factual sentence missing citation");
  });
});
