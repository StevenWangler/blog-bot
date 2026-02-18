import { loadConfig } from "../../utils/config.js";
import { createRunLogger, logger } from "../../utils/logger.js";
import { loadAgents } from "../../agents/loader.js";
import { pickAgent } from "../../agents/manager.js";
import { loadState, saveState } from "../../state/store.js";
import { createOpenAIClient } from "../../services/openai/client.js";
import { generateHumanReply } from "../../services/content-generator.js";
import { createWixClient } from "../../services/wix/client.js";
import { createComment, listComments } from "../../services/wix/comments.js";
import { buildRichContentFromMarkdown } from "../../services/wix/rich-content.js";
import { upsertHuman } from "../../state/humans.js";
import { createRunId } from "../../utils/run.js";

export type RunRespondOptions = {
  runId?: string;
  postId?: string;
};

export async function runRespondCommand(options: RunRespondOptions = {}): Promise<number> {
  const config = loadConfig();
  const runId = options.runId ?? createRunId("respond");
  const runLogger = createRunLogger(runId);
  const state = loadState(config.STATE_PATH);
  const agents = loadAgents("config/agents");
  if (agents.length === 0) {
    throw new Error("No agents configured in config/agents.");
  }
  if (state.posts.length === 0) {
    runLogger.info("No posts available to respond to.");
    return 0;
  }

  const openai = createOpenAIClient(config);
  const wixClient = createWixClient(config);
  const recentPost =
    (options.postId ? state.posts.find((post) => post.id === options.postId) : undefined) ??
    state.posts[state.posts.length - 1];
  if (!recentPost) {
    runLogger.info("No posts available to respond to.");
    return 0;
  }

  const commentsResponse = await listComments(wixClient, recentPost.id, 50);
  const comments = commentsResponse.comments ?? [];
  let replies = 0;
  for (const comment of comments) {
    const authorId = comment.author?.memberId;
    if (!authorId) continue;
    if (authorId === config.WIX_MEMBER_ID) continue;
    const alreadyHandled = state.comments.some((record) => record.id === comment.id);
    if (alreadyHandled) continue;

    const agent = pickAgent(agents);
    const rawText = JSON.stringify(comment.content?.richContent ?? {});
    const reply = await generateHumanReply(
      openai,
      config.OPENAI_MODEL,
      agent,
      recentPost.title,
      rawText
    );

    const richContent = buildRichContentFromMarkdown(reply.replyMarkdown);
    const wixComment = await createComment(
      wixClient,
      recentPost.id,
      config.WIX_MEMBER_ID,
      richContent,
      comment.id
    );

    const commentRecord = {
      id: wixComment.id,
      postId: recentPost.id,
      authorId: agent.id,
      authorType: "agent" as const,
      createdAt: wixComment.createdDate ?? new Date().toISOString(),
      ...(comment.id ? { parentCommentId: comment.id } : {}),
    };
    state.comments.push(commentRecord);
    replies += 1;

    upsertHuman(state, {
      id: authorId,
      ...(comment.author?.name ? { displayName: comment.author.name } : {}),
      lastSeenAt: new Date().toISOString(),
    });
  }

  saveState(config.STATE_PATH, state);
  runLogger.info("Responded to new human comments.", { replies });
  return replies;
}
