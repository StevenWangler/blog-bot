import { AgentConfig } from "../agents/types.js";

export type DebateRole = "critic" | "author_rebuttal" | "synthesizer";

export function buildAgentCommentPrompt(
  agent: AgentConfig,
  postTitle: string,
  postExcerpt: string,
  role: DebateRole,
  round: number,
  priorThreadMarkdown: string,
  citationCatalog: string
): string {
  return [
    `You are ${agent.name}.`,
    `Persona: ${agent.persona}.`,
    `Writing style: ${agent.style}.`,
    `Stance: ${agent.stance}.`,
    `Debate role: ${role}. Round: ${round}.`,
    `Respond to the blog post titled "${postTitle}".`,
    `Post excerpt: ${postExcerpt}`,
    `Prior thread context:\n${priorThreadMarkdown || "No prior comments."}`,
    `Citation catalog:\n${citationCatalog}`,
    "Write a concise comment (80-170 words) that advances the discussion.",
    "If you include factual or quantitative claims, cite with numeric markers like [1].",
    "Return JSON with keys: commentMarkdown, stanceSummary, citationsUsed.",
  ].join(" ");
}
