import OpenAI from "openai";
import { AgentConfig } from "../../agents/types.js";
import { collectResearch } from "./collector.js";
import { persistResearchArtifacts, ResearchArtifactFiles } from "./artifacts.js";
import { validateResearchResult } from "./validator.js";
import { ValidatedResearchDossier } from "./types.js";

export type RunResearchOptions = {
  model: string;
  timezone: string;
  minSources: number;
  maxSourceAgeDays: number;
  maxAttempts: number;
  researchPath: string;
};

export type RunResearchResult = {
  dossier: ValidatedResearchDossier;
  artifacts: ResearchArtifactFiles;
  attempts: number;
};

export async function runResearchPipeline(
  client: OpenAI,
  agent: AgentConfig,
  options: RunResearchOptions
): Promise<RunResearchResult> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      const raw = await collectResearch(client, agent, {
        model: options.model,
        timezone: options.timezone,
        minSources: options.minSources,
        maxSourceAgeDays: options.maxSourceAgeDays,
      });
      const dossier = validateResearchResult(agent, raw, {
        minSources: options.minSources,
        maxSourceAgeDays: options.maxSourceAgeDays,
      });
      const artifacts = persistResearchArtifacts(options.researchPath, dossier);
      return { dossier, artifacts, attempts: attempt };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown research pipeline error");
    }
  }
  throw lastError ?? new Error("Research pipeline failed.");
}
