import { describe, expect, it } from "vitest";
import { buildAgentCommentPrompt } from "../../src/prompts/comment.js";

describe("buildAgentCommentPrompt", () => {
  it("requires citations only for factual or quantitative claims", () => {
    const prompt = buildAgentCommentPrompt(
      {
        id: "agent-1",
        name: "Agent One",
        persona: "Analytical",
        style: "Direct",
        stance: "Balanced",
        scheduleCron: "0 0 * * *",
      },
      "Test Post",
      "Test excerpt",
      "critic",
      1,
      "",
      "[1] Source A (https://example.com/a)"
    );

    expect(prompt).toContain("Opinions and interpretation are allowed without citations.");
    expect(prompt).toContain(
      "Any factual or quantitative claim must include inline numeric citations like [1] that map to entries in the citation catalog."
    );
    expect(prompt).toContain("Do not invent citation numbers or cite outside the provided citation catalog.");
  });
});
