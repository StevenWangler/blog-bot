import { AgentConfig } from "../agents/types.js";
import { ValidatedResearchDossier } from "../services/research/types.js";

export function buildBlogPostPrompt(agent: AgentConfig, dossier: ValidatedResearchDossier): string {
  const sourcesList = dossier.sources
    .map((source, index) => `[${index + 1}] ${source.title} (${source.url})`)
    .join("\n");
  const claimsList = dossier.supportedClaims
    .map((claim) => `- ${claim.text} (sources: ${claim.sourceIds.join(", ")})`)
    .join("\n");

  return [
    `You are ${agent.name}.`,
    `Persona: ${agent.persona}.`,
    `Writing style: ${agent.style}.`,
    `Stance: ${agent.stance}.`,
    `Topic focus: ${dossier.topic}`,
    `Research summary: ${dossier.summary}`,
    "Use only validated claims and sources below.",
    `Validated claims:\n${claimsList}`,
    `Sources catalog:\n${sourcesList}`,
    "Write a blog post with a clear title and 4-6 sections focused only on current AI news and research developments.",
    "Center the article on what changed, why it matters now, and practical implications for teams building with AI.",
    "Do not drift into unrelated business, marketing, or generic productivity topics.",
    "For factual or quantitative statements, include inline numeric citations like [1], [2].",
    "End the article with '## Sources' and numbered references matching the citations.",
    "Return JSON with keys: title, outline, bodyMarkdown, excerpt.",
    "Keep bodyMarkdown under 1200 words.",
  ].join(" ");
}
