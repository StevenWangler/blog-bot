import { describe, expect, it } from "vitest";
import { validateResearchResult } from "../../src/services/research/validator.js";
import { AgentConfig } from "../../src/agents/types.js";
import { RawResearchResult } from "../../src/services/research/types.js";

const agent: AgentConfig = {
  id: "alex",
  name: "Alex",
  persona: "CTO",
  style: "direct",
  stance: "pragmatic",
  scheduleCron: "0 9 * * 1-5",
};

describe("validateResearchResult", () => {
  it("dedupes by domain and drops unsupported claims", () => {
    const raw: RawResearchResult = {
      topic: "AI reliability practices",
      summary: "Summary text long enough for testing.",
      sources: [
        { url: "https://example.com/a", title: "A" },
        { url: "https://www.example.com/b", title: "B duplicate domain" },
        { url: "https://second.com/c", title: "C" },
      ],
      claims: [
        { text: "Supported claim", sourceUrls: ["https://example.com/a"] },
        { text: "Unsupported claim", sourceUrls: ["https://missing.com/nope"] },
      ],
    };

    const dossier = validateResearchResult(agent, raw, {
      minSources: 2,
      maxSourceAgeDays: 365,
      now: new Date("2026-02-17T00:00:00.000Z"),
    });

    expect(dossier.sources).toHaveLength(2);
    expect(dossier.supportedClaims).toHaveLength(1);
    expect(dossier.droppedClaims).toHaveLength(1);
  });

  it("fails when fewer than minimum sources remain", () => {
    const raw: RawResearchResult = {
      topic: "AI reliability practices",
      summary: "Summary text long enough for testing.",
      sources: [{ url: "https://example.com/a", title: "A" }],
      claims: [{ text: "Claim", sourceUrls: ["https://example.com/a"] }],
    };

    expect(() =>
      validateResearchResult(agent, raw, {
        minSources: 2,
        maxSourceAgeDays: 365,
      })
    ).toThrow(/requires at least 2/);
  });

  it("fails when research topic is not AI-focused", () => {
    const raw: RawResearchResult = {
      topic: "Restaurant retention strategy in urban markets",
      summary: "A market-analysis summary focused on staffing and pricing trends in food service.",
      sources: [
        { url: "https://example.com/retention", title: "Retention trends in restaurants" },
        { url: "https://second.com/pricing", title: "Pricing behavior in hospitality" },
      ],
      claims: [
        {
          text: "Independent restaurants are changing menu prices more frequently than last year.",
          sourceUrls: ["https://example.com/retention"],
        },
      ],
    };

    expect(() =>
      validateResearchResult(agent, raw, {
        minSources: 2,
        maxSourceAgeDays: 365,
      })
    ).toThrow(/must be AI-focused/i);
  });
});
