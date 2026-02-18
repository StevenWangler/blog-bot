export type ResearchSource = {
  id: string;
  url: string;
  normalizedUrl: string;
  domain: string;
  title: string;
  summary: string;
  publishedAt?: string;
};

export type ResearchClaimStatus = "supported" | "dropped";

export type ResearchClaim = {
  id: string;
  text: string;
  sourceIds: string[];
  status: ResearchClaimStatus;
  reason?: string;
};

export type ResearchDossier = {
  id: string;
  agentId: string;
  topic: string;
  createdAt: string;
  summary: string;
  sources: ResearchSource[];
  claims: ResearchClaim[];
};

export type RawResearchSource = {
  url: string;
  title: string;
  summary?: string | undefined;
  publishedAt?: string | undefined;
};

export type RawResearchClaim = {
  text: string;
  sourceUrls: string[];
};

export type RawResearchResult = {
  topic: string;
  summary: string;
  sources: RawResearchSource[];
  claims: RawResearchClaim[];
};

export type ValidatedResearchDossier = ResearchDossier & {
  supportedClaims: ResearchClaim[];
  droppedClaims: ResearchClaim[];
};
