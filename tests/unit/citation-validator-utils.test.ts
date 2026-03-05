import { describe, expect, it } from "vitest";
import { validateFactualClaimCitations } from "../../src/services/content-generator.js";

describe("validateFactualClaimCitations", () => {
  it("accepts opinion-only text when no sources are available", () => {
    const result = validateFactualClaimCitations("I appreciate this perspective and would try it.", 0);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts opinion-only text with no citations", () => {
    const result = validateFactualClaimCitations(
      "I think this approach feels promising and aligns with long-term goals.",
      3
    );
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects factual percentage claims without citation", () => {
    const result = validateFactualClaimCitations("Adoption increased by 42 percent in one quarter.", 3);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("Factual sentence missing citation");
  });

  it("accepts factual claims with in-range citation", () => {
    const result = validateFactualClaimCitations(
      "Adoption increased by 42 percent in one quarter [1].",
      3
    );
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects out-of-range inline citations", () => {
    const result = validateFactualClaimCitations("The report shows a 12% gain [99].", 3);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("out of allowed source range 1-3");
  });
});
