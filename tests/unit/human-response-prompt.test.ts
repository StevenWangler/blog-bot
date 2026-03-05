import { describe, expect, it } from "vitest";
import { buildHumanResponsePrompt } from "../../src/prompts/human-response.js";

describe("buildHumanResponsePrompt", () => {
  it("includes citation catalog rules while allowing opinionated replies", () => {
    const prompt = buildHumanResponsePrompt(
      {
        id: "agent-1",
        name: "Agent One",
        persona: "Helpful analyst",
        style: "Conversational",
        stance: "Pragmatic",
        scheduleCron: "0 * * * *",
      },
      "AI trends",
      "I liked this post.",
      "[1] Source One (https://example.com)"
    );

    expect(prompt).toContain("Citation catalog:");
    expect(prompt).toContain("Opinions and personal reactions can be shared without citations.");
    expect(prompt).toContain(
      "Any factual or quantitative claim must include an inline [n] citation from the citation catalog."
    );
  });
});
