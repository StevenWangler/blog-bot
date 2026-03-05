import OpenAI from "openai";
import { z } from "zod";
import { AgentConfig } from "../agents/types.js";
import { buildBlogPostPrompt } from "../prompts/blog-post.js";
import { buildImagePrompt } from "../prompts/image-prompt.js";
import { buildAgentCommentPrompt, DebateRole } from "../prompts/comment.js";
import { buildHumanResponsePrompt } from "../prompts/human-response.js";
import { generateJson } from "./openai/chat.js";
import { ValidatedResearchDossier } from "./research/types.js";

export type BlogPostContent = {
  title: string;
  outline: string[];
  bodyMarkdown: string;
  excerpt: string;
  imagePrompt: string;
};

export type CommentContent = {
  commentMarkdown: string;
  stanceSummary: string;
  citationsUsed: number[];
};

export type HumanReplyContent = {
  replyMarkdown: string;
  followUpQuestion: string;
};

export async function generateBlogPost(
  client: OpenAI,
  model: string,
  agent: AgentConfig,
  imageStyle: string,
  dossier: ValidatedResearchDossier
): Promise<BlogPostContent> {
  const sourceCount = dossier.sources.length;
  const basePrompt = buildBlogPostPrompt(agent, dossier);
  const blogSchema = z.object({
    title: z.string().min(5),
    outline: z.array(z.string().min(2)).min(3),
    bodyMarkdown: z.string().min(200),
    excerpt: z.string().min(30),
  });

  const draft = await generateJson(client, model, basePrompt, blogSchema);

  const imagePrompt = buildImagePrompt(draft.title, imageStyle, draft.outline ?? []);
  return { ...draft, imagePrompt };
}

export async function generateAgentComment(
  client: OpenAI,
  model: string,
  agent: AgentConfig,
  postTitle: string,
  postExcerpt: string,
  role: DebateRole,
  round: number,
  priorThreadMarkdown: string,
  citationCatalog: string
): Promise<CommentContent> {
  const prompt = buildAgentCommentPrompt(
    agent,
    postTitle,
    postExcerpt,
    role,
    round,
    priorThreadMarkdown,
    citationCatalog
  );
  const schema = z.object({
    commentMarkdown: z.string().min(20),
    stanceSummary: z.string().min(4),
    citationsUsed: z.array(z.number().int().positive()).default([]),
  });
  return generateJson(client, model, prompt, schema);
}

export async function generateHumanReply(
  client: OpenAI,
  model: string,
  agent: AgentConfig,
  postTitle: string,
  humanComment: string,
  citationCatalog: string
): Promise<HumanReplyContent> {
  const prompt = buildHumanResponsePrompt(agent, postTitle, humanComment, citationCatalog);
  const schema = z.object({
    replyMarkdown: z.string().min(20),
    followUpQuestion: z.string().min(5),
  });
  return generateJson(client, model, prompt, schema);
}

function collectInlineCitationNumbers(markdown: string): Set<number> {
  const citedNumbers = new Set<number>();
  for (const match of markdown.matchAll(/\[(\d+)\]/g)) {
    citedNumbers.add(Number(match[1]));
  }
  return citedNumbers;
}

function getCitationValidationSentences(markdown: string): string[] {
  return markdown
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function isLikelyFactualSentence(sentence: string): boolean {
  return (
    /\b(study|survey|paper|dataset|experiment)\b/i.test(sentence) ||
    /\baccording to\b/i.test(sentence) ||
    /\b\d+(\.\d+)?%\b/.test(sentence) ||
    /\b\d+(\.\d+)?\s*(percent|percentage points?)\b/i.test(sentence)
  );
}

function getMissingFactualCitationError(markdown: string): string | undefined {
  for (const sentence of getCitationValidationSentences(markdown)) {
    if (!isLikelyFactualSentence(sentence)) continue;
    if (!/\[\d+\]/.test(sentence)) {
      return `Factual sentence missing citation: "${sentence.slice(0, 80)}..."`;
    }
  }
  return undefined;
}

export function validateFactualClaimCitations(
  textMarkdown: string,
  maxSourceNumber: number
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const citedNumbers = collectInlineCitationNumbers(textMarkdown);
  for (const cited of citedNumbers) {
    if (cited < 1 || cited > maxSourceNumber) {
      errors.push(`Inline citation [${cited}] is out of allowed source range 1-${maxSourceNumber}.`);
    }
  }

  const factualCitationError = getMissingFactualCitationError(textMarkdown);
  if (factualCitationError) {
    errors.push(factualCitationError);
  }

  return { ok: errors.length === 0, errors };
}

export function validatePostCitations(
  bodyMarkdown: string,
  maxSourceNumber: number
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const split = bodyMarkdown.split(/\n## Sources\b/i);
  if (split.length < 2) {
    errors.push("Missing '## Sources' section.");
    return { ok: false, errors };
  }
  const articleBody = split[0] ?? "";
  const sourcesSection = split.slice(1).join("\n## Sources");

  const citedNumbers = collectInlineCitationNumbers(articleBody);
  if (citedNumbers.size === 0) {
    errors.push("No inline citations found in body.");
  }
  for (const cited of citedNumbers) {
    if (cited < 1 || cited > maxSourceNumber) {
      errors.push(`Inline citation [${cited}] is out of allowed source range 1-${maxSourceNumber}.`);
    }
  }

  for (const cited of citedNumbers) {
    const sourcePattern = new RegExp(
      `(?:^|\\n)\\s*(?:[-*]\\s*)?(?:\\[${cited}\\]|${cited}[.)])\\s+.+https?:\\/\\/`,
      "i"
    );
    if (!sourcePattern.test(sourcesSection)) {
      errors.push(`Sources section missing reference entry for [${cited}].`);
    }
  }

  const factualCitationError = getMissingFactualCitationError(articleBody);
  if (factualCitationError) {
    errors.push(factualCitationError);
  }

  return { ok: errors.length === 0, errors };
}
