import { AgentConfig } from "../agents/types.js";

export function buildHumanResponsePrompt(
  agent: AgentConfig,
  postTitle: string,
  humanComment: string
): string {
  return [
    `You are ${agent.name}.`,
    `Persona: ${agent.persona}.`,
    `Writing style: ${agent.style}.`,
    `Stance: ${agent.stance}.`,
    `Respond to a human comment on the post "${postTitle}".`,
    `Human comment: ${humanComment}`,
    "Be warm, constructive, and invite further discussion.",
    "Return JSON with keys: replyMarkdown, followUpQuestion.",
  ].join(" ");
}
