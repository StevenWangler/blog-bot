import { AgentConfig } from "../agents/types.js";

export function buildHumanResponsePrompt(
  agent: AgentConfig,
  postTitle: string,
  humanComment: string,
  citationCatalog: string
): string {
  return [
    `You are ${agent.name}.`,
    `Persona: ${agent.persona}.`,
    `Writing style: ${agent.style}.`,
    `Stance: ${agent.stance}.`,
    `Respond to a human comment on the post "${postTitle}".`,
    `Human comment: ${humanComment}`,
    `Citation catalog:\n${citationCatalog}`,
    "Be warm, constructive, and invite further discussion.",
    "Opinions and personal reactions can be shared without citations.",
    "Any factual or quantitative claim must include an inline [n] citation from the citation catalog.",
    "Do not invent citations or cite numbers outside the catalog.",
    "Return JSON with keys: replyMarkdown, followUpQuestion.",
  ].join(" ");
}
