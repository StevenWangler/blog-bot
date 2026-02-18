import { AgentConfig } from "../../agents/types.js";
import { createRunId } from "../../utils/run.js";
import {
  RawResearchResult,
  ResearchClaim,
  ResearchSource,
  ValidatedResearchDossier,
} from "./types.js";

const AI_TOPIC_PATTERNS: RegExp[] = [
  /\bartificial intelligence\b/i,
  /\bai\b/i,
  /\bmachine learning\b/i,
  /\bml\b/i,
  /\bllm\b/i,
  /\blarge language model\b/i,
  /\bgenerative ai\b/i,
  /\bfoundation model\b/i,
  /\bneural network\b/i,
  /\bopenai\b/i,
  /\banthropic\b/i,
  /\bdeepmind\b/i,
];

export type ValidateResearchOptions = {
  minSources: number;
  maxSourceAgeDays: number;
  now?: Date;
};

export function validateResearchResult(
  agent: AgentConfig,
  raw: RawResearchResult,
  options: ValidateResearchOptions
): ValidatedResearchDossier {
  if (!isAiFocusedResearch(raw)) {
    throw new Error(
      "Research quality gate failed: topic must be AI-focused and cover recent AI research or developments."
    );
  }

  const now = options.now ?? new Date();
  const sources = normalizeAndDedupeSources(raw.sources, options.maxSourceAgeDays, now);
  if (sources.length < options.minSources) {
    throw new Error(
      `Research quality gate failed: ${sources.length} valid sources found, requires at least ${options.minSources}.`
    );
  }

  const sourceIdsByUrl = new Map<string, string>();
  const sourceIdsByDomain = new Map<string, string>();
  for (const source of sources) {
    sourceIdsByUrl.set(source.normalizedUrl, source.id);
    sourceIdsByDomain.set(source.domain, source.id);
  }

  const claims: ResearchClaim[] = raw.claims.map((claim, index) => {
    const linked = new Set<string>();
    for (const sourceUrl of claim.sourceUrls) {
      const normalized = normalizeUrl(sourceUrl);
      if (!normalized) continue;
      const fromUrl = sourceIdsByUrl.get(normalized.normalizedUrl);
      if (fromUrl) linked.add(fromUrl);
      const fromDomain = sourceIdsByDomain.get(normalized.domain);
      if (fromDomain) linked.add(fromDomain);
    }
    if (linked.size === 0) {
      return {
        id: `C${index + 1}`,
        text: claim.text,
        sourceIds: [],
        status: "dropped",
        reason: "No validated source linkage.",
      };
    }
    return {
      id: `C${index + 1}`,
      text: claim.text,
      sourceIds: Array.from(linked),
      status: "supported",
    };
  });

  const supportedClaims = claims.filter((claim) => claim.status === "supported");
  if (supportedClaims.length === 0) {
    throw new Error("Research quality gate failed: no supported claims.");
  }
  const droppedClaims = claims.filter((claim) => claim.status === "dropped");

  const dossier: ValidatedResearchDossier = {
    id: createRunId("dossier"),
    agentId: agent.id,
    topic: raw.topic,
    createdAt: now.toISOString(),
    summary: raw.summary,
    sources,
    claims,
    supportedClaims,
    droppedClaims,
  };
  return dossier;
}

function isAiFocusedResearch(raw: RawResearchResult): boolean {
  const textBlob = [
    raw.topic,
    raw.summary,
    ...raw.claims.map((claim) => claim.text),
    ...raw.sources.map((source) => `${source.title} ${source.summary ?? ""}`),
  ]
    .join(" ")
    .toLowerCase();
  return AI_TOPIC_PATTERNS.some((pattern) => pattern.test(textBlob));
}

export function normalizeAndDedupeSources(
  rawSources: RawResearchResult["sources"],
  maxSourceAgeDays: number,
  now: Date
): ResearchSource[] {
  const byDomain = new Map<string, ResearchSource>();
  const maxAgeMs = maxSourceAgeDays * 24 * 60 * 60 * 1000;

  for (const raw of rawSources) {
    const normalized = normalizeUrl(raw.url);
    if (!normalized) continue;
    if (raw.publishedAt) {
      const published = new Date(raw.publishedAt);
      if (!Number.isNaN(published.getTime())) {
        const age = now.getTime() - published.getTime();
        if (age > maxAgeMs) {
          continue;
        }
      }
    }
    const candidate: ResearchSource = {
      id: "",
      url: raw.url,
      normalizedUrl: normalized.normalizedUrl,
      domain: normalized.domain,
      title: raw.title,
      summary: raw.summary ?? "",
      ...(raw.publishedAt ? { publishedAt: raw.publishedAt } : {}),
    };

    // Keep one source per domain to maximize breadth and reduce duplicate citation clusters.
    if (!byDomain.has(candidate.domain)) {
      byDomain.set(candidate.domain, candidate);
    }
  }

  const deduped = Array.from(byDomain.values());
  deduped.sort((a, b) => a.domain.localeCompare(b.domain));
  return deduped.map((source, index) => ({ ...source, id: `S${index + 1}` }));
}

export function normalizeUrl(rawUrl: string): { normalizedUrl: string; domain: string } | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    const normalizedUrl = `${url.protocol}//${host}${pathname}`;
    return { normalizedUrl, domain: host };
  } catch {
    return null;
  }
}
