import OpenAI from "openai";
import { z } from "zod";
import { AgentConfig } from "../../agents/types.js";
import { RawResearchResult } from "./types.js";

const rawResearchSchema = z.object({
  topic: z.string().min(10),
  summary: z.string().min(20),
  sources: z
    .array(
      z.object({
        url: z.string().url(),
        title: z.string().min(1),
        summary: z.string().optional(),
        publishedAt: z.string().optional(),
      })
    )
    .min(1),
  claims: z
    .array(
      z.object({
        text: z.string().min(10),
        sourceUrls: z.array(z.string().url()).min(1),
      })
    )
    .min(1),
});

export type CollectResearchOptions = {
  model: string;
  timezone: string;
  minSources: number;
  maxSourceAgeDays: number;
};

export async function collectResearch(
  client: OpenAI,
  agent: AgentConfig,
  options: CollectResearchOptions
): Promise<RawResearchResult> {
  const nowIso = new Date().toISOString();
  const prompt = [
    `You are ${agent.name}, ${agent.persona}.`,
    "Research only latest AI developments before writing.",
    "Focus on AI research papers, model and product launches, benchmarks, policy/safety updates, and major AI industry moves.",
    "Exclude topics that are not materially about artificial intelligence.",
    `Today's date is ${nowIso}.`,
    `Use web search and provide at least ${options.minSources} distinct primary/reputable sources.`,
    `Prefer sources published within the last ${options.maxSourceAgeDays} days when available.`,
    "Prioritize items that include concrete dates, measurements, and named organizations.",
    "Return JSON only with fields: topic, summary, sources, claims.",
    "Each source item: url, title, summary, publishedAt (ISO date when known).",
    "Each claim item: text, sourceUrls (must reference URLs from sources).",
    "Do not include unsupported claims. Do not include markdown.",
  ].join(" ");

  const response = await client.responses.create({
    model: options.model,
    input: prompt,
    tools: [
      {
        type: "web_search_preview",
        search_context_size: "high",
        user_location: {
          type: "approximate",
          country: "US",
          timezone: options.timezone,
        },
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "research_dossier",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["topic", "summary", "sources", "claims"],
          properties: {
            topic: { type: "string" },
            summary: { type: "string" },
            sources: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["url", "title"],
                properties: {
                  url: { type: "string" },
                  title: { type: "string" },
                  summary: { type: "string" },
                  publishedAt: { type: "string" },
                },
              },
            },
            claims: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["text", "sourceUrls"],
                properties: {
                  text: { type: "string" },
                  sourceUrls: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const text = response.output_text?.trim();
  if (!text) {
    throw new Error("Research response did not include output text.");
  }
  const parsed = rawResearchSchema.parse(JSON.parse(text));
  return parsed as RawResearchResult;
}
