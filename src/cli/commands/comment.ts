import fs from "node:fs";
import { loadConfig } from "../../utils/config.js";
import { createRunLogger, logger } from "../../utils/logger.js";
import { loadAgents } from "../../agents/loader.js";
import { pickAgent } from "../../agents/manager.js";
import { AgentConfig } from "../../agents/types.js";
import { DebateRecord } from "../../state/types.js";
import { loadState, saveState } from "../../state/store.js";
import { createOpenAIClient } from "../../services/openai/client.js";
import { generateAgentComment } from "../../services/content-generator.js";
import { createWixClient } from "../../services/wix/client.js";
import { createComment } from "../../services/wix/comments.js";
import { buildRichContentFromMarkdown } from "../../services/wix/rich-content.js";
import { createRunId } from "../../utils/run.js";

export type RunCommentOptions = {
  postId?: string;
  maxRounds?: number;
  runId?: string;
};

export type CommentCommandResult = {
  debate?: DebateRecord;
  skippedReason?: string;
};

export async function runCommentCommand(options: RunCommentOptions = {}): Promise<CommentCommandResult> {
  const config = loadConfig();
  const runId = options.runId ?? createRunId("comment");
  const runLogger = createRunLogger(runId);
  const state = loadState(config.STATE_PATH);
  const agents = loadAgents("config/agents");
  if (agents.length === 0) {
    throw new Error("No agents configured in config/agents.");
  }
  if (state.posts.length === 0) {
    runLogger.info("No posts available to comment on.");
    return { skippedReason: "No posts" };
  }

  const openai = createOpenAIClient(config);
  const wixClient = createWixClient(config);
  const recentPost =
    (options.postId ? state.posts.find((post) => post.id === options.postId) : undefined) ??
    state.posts[state.posts.length - 1];
  if (!recentPost) {
    runLogger.info("No posts available to comment on.");
    return { skippedReason: "No matching post" };
  }

  const maxRounds = Math.min(options.maxRounds ?? config.MAX_DEBATE_ROUNDS, 3);
  const roundAgents = selectDebateAgents(agents, recentPost.agentId);
  const citationCatalog = loadCitationCatalog(state, recentPost.id);
  const debate: DebateRecord = {
    id: createRunId("debate"),
    postId: recentPost.id,
    createdAt: new Date().toISOString(),
    status: "partial",
    rounds: [],
  };

  let parentCommentId: string | undefined;
  let priorThreadMarkdown = "";
  for (let round = 1; round <= maxRounds; round += 1) {
    const roundAgent = roundAgents[round - 1];
    if (!roundAgent) break;
    const role = round === 1 ? "critic" : round === 2 ? "author_rebuttal" : "synthesizer";
    const generated = await generateAgentComment(
      openai,
      config.OPENAI_MODEL,
      roundAgent,
      recentPost.title,
      recentPost.title,
      role,
      round,
      priorThreadMarkdown,
      citationCatalog
    );

    const richContent = buildRichContentFromMarkdown(generated.commentMarkdown);
    const wixComment = await createComment(
      wixClient,
      recentPost.id,
      config.WIX_MEMBER_ID,
      richContent,
      parentCommentId
    );

    state.comments.push({
      id: wixComment.id,
      postId: recentPost.id,
      authorId: roundAgent.id,
      authorType: "agent",
      createdAt: wixComment.createdDate ?? new Date().toISOString(),
      ...(parentCommentId ? { parentCommentId } : {}),
    });

    debate.rounds.push({
      round,
      agentId: roundAgent.id,
      commentId: wixComment.id,
      createdAt: wixComment.createdDate ?? new Date().toISOString(),
      ...(parentCommentId ? { parentCommentId } : {}),
      citationCount: generated.citationsUsed.length,
    });

    parentCommentId = wixComment.id;
    priorThreadMarkdown = `${priorThreadMarkdown}\n[Round ${round} - ${roundAgent.name}] ${generated.commentMarkdown}`.trim();
  }

  debate.status = debate.rounds.length === maxRounds ? "completed" : "partial";
  if (debate.rounds.length > 0) {
    state.debates.push(debate);
  }
  saveState(config.STATE_PATH, state);
  runLogger.info(`Debate completed on ${recentPost.title}`, {
    rounds: debate.rounds.length,
    status: debate.status,
  });
  return debate.rounds.length > 0 ? { debate } : { skippedReason: "No debate rounds produced" };
}

function selectDebateAgents(agents: AgentConfig[], authorAgentId: string): AgentConfig[] {
  const author = agents.find((agent) => agent.id === authorAgentId) ?? pickAgent(agents);
  const critic = pickAgent(agents, [author.id]);
  const synthCandidates = agents.filter((agent) => ![author.id, critic.id].includes(agent.id));
  const synthesizer = synthCandidates[0] ?? critic;
  return [critic, author, synthesizer];
}

function loadCitationCatalog(state: ReturnType<typeof loadState>, postId: string): string {
  const artifact = [...state.researchArtifacts].reverse().find((record) => record.postId === postId);
  if (!artifact) return "No citation catalog available.";
  if (!fs.existsSync(artifact.dossierPath)) return "No citation catalog available.";
  try {
    const parsed = JSON.parse(fs.readFileSync(artifact.dossierPath, "utf8")) as {
      sources?: Array<{ title?: string; url?: string }>;
    };
    const sources = parsed.sources ?? [];
    if (sources.length === 0) return "No citation catalog available.";
    return sources
      .map((source, index) => `[${index + 1}] ${source.title ?? "Untitled"} (${source.url ?? "missing-url"})`)
      .join("\n");
  } catch {
    return "No citation catalog available.";
  }
}
