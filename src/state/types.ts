export type AgentMemory = {
  agentId: string;
  lastPostId?: string;
  lastCommentedPostId?: string;
  recentTopics: string[];
};

export type CommentRecord = {
  id: string;
  postId: string;
  authorId: string;
  authorType: "agent" | "human";
  createdAt: string;
  parentCommentId?: string;
};

export type PostRecord = {
  id: string;
  title: string;
  agentId: string;
  createdAt: string;
  wixUrl?: string;
  heroImageUrl?: string;
};

export type HumanProfile = {
  id: string;
  displayName?: string;
  lastSeenAt: string;
};

export type ResearchArtifactRecord = {
  id: string;
  runId: string;
  agentId: string;
  createdAt: string;
  postId?: string;
  dossierPath: string;
  summaryPath: string;
  sourceCount: number;
  supportedClaimCount: number;
  droppedClaimCount: number;
};

export type RunStatus = "skipped" | "failed" | "published" | "completed";

export type RunHistoryRecord = {
  runId: string;
  command: string;
  status: RunStatus;
  startedAt: string;
  endedAt: string;
  reason?: string;
  error?: string;
  slotKey?: string;
  postId?: string;
  agentId?: string;
};

export type DebateRoundRecord = {
  round: number;
  agentId: string;
  commentId: string;
  createdAt: string;
  parentCommentId?: string;
  citationCount: number;
};

export type DebateRecord = {
  id: string;
  postId: string;
  createdAt: string;
  status: "completed" | "partial";
  rounds: DebateRoundRecord[];
};

export type BotState = {
  version: number;
  posts: PostRecord[];
  comments: CommentRecord[];
  agents: AgentMemory[];
  humans: HumanProfile[];
  researchArtifacts: ResearchArtifactRecord[];
  runHistory: RunHistoryRecord[];
  debates: DebateRecord[];
};
