import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig, parseIdList } from "../../utils/config.js";
import { createRunLogger, logger } from "../../utils/logger.js";
import { loadAgents } from "../../agents/loader.js";
import { selectDueAgents } from "../../agents/scheduler.js";
import { createOpenAIClient } from "../../services/openai/client.js";
import { generateImage } from "../../services/openai/images.js";
import { generateBlogPost } from "../../services/content-generator.js";
import { runResearchPipeline } from "../../services/research/index.js";
import { createWixClient } from "../../services/wix/client.js";
import { uploadImageFromBase64 } from "../../services/wix/media.js";
import { createDraftPost, publishDraftPost } from "../../services/wix/posts.js";
import { buildDraftPostPayload } from "../../services/wix/payloads.js";
import { PostRecord } from "../../state/types.js";
import { loadState, saveState } from "../../state/store.js";
import { createRunId } from "../../utils/run.js";

export type RunPostOptions = {
  runId?: string;
  forceAgentIds?: string[];
  maxPosts?: number;
  skipSchedule?: boolean;
  localOnly?: boolean;
  localDraftsPath?: string;
  now?: Date;
};

export type PostCommandResult = {
  publishedPosts: PostRecord[];
  skippedReason?: string;
  failures: Array<{ agentId: string; reason: string }>;
};

export async function runPostCommand(options: RunPostOptions = {}): Promise<PostCommandResult> {
  const localOnly = options.localOnly ?? false;
  const config = loadConfig(undefined, { requireWix: !localOnly });
  const runId = options.runId ?? createRunId("post");
  const runLogger = createRunLogger(runId);
  const agents = loadAgents("config/agents");
  if (agents.length === 0) {
    throw new Error("No agents configured in config/agents.");
  }
  const now = options.now ?? new Date();
  const candidateAgents = options.forceAgentIds?.length
    ? agents.filter((agent) => options.forceAgentIds?.includes(agent.id))
    : options.skipSchedule
      ? agents
      : selectDueAgents(agents, now, { timezone: config.SCHEDULE_TIMEZONE });

  if (candidateAgents.length === 0) {
    runLogger.info("No agents due to post at this time.");
    return { publishedPosts: [], skippedReason: "No due agents", failures: [] };
  }
  const maxPosts = options.maxPosts ?? candidateAgents.length;
  const selectedAgents = candidateAgents.slice(0, maxPosts);

  const openai = createOpenAIClient(config);
  const wixClient = localOnly ? null : createWixClient(config);
  const localDraftsPath = path.resolve(options.localDraftsPath ?? config.LOCAL_DRAFTS_PATH);
  const state = loadState(config.STATE_PATH);
  const publishedPosts: PostRecord[] = [];
  const failures: Array<{ agentId: string; reason: string }> = [];

  for (const agent of selectedAgents) {
    try {
      runLogger.info(`Researching for ${agent.name}`);
      const research = await runResearchPipeline(openai, agent, {
        model: config.RESEARCH_MODEL,
        timezone: config.SCHEDULE_TIMEZONE,
        minSources: config.MIN_SOURCES_PER_POST,
        maxSourceAgeDays: config.MAX_SOURCE_AGE_DAYS,
        maxAttempts: config.MAX_RESEARCH_ATTEMPTS,
        researchPath: config.RESEARCH_PATH,
      });

      runLogger.info(`Generating post for ${agent.name}`);
      const post = await generateBlogPost(
        openai,
        config.OPENAI_MODEL,
        agent,
        config.IMAGE_STYLE,
        research.dossier
      );

      runLogger.info(`Generating image for ${agent.name}`);
      const image = await generateImage(openai, config.OPENAI_IMAGE_MODEL, post.imagePrompt);
      const base64 = image.base64;
      const createdAt = new Date().toISOString();
      let postRecord: PostRecord;

      if (localOnly) {
        const localDraft = await saveLocalDraft({
          outputRoot: localDraftsPath,
          agentId: agent.id,
          title: post.title,
          excerpt: post.excerpt,
          bodyMarkdown: post.bodyMarkdown,
          imagePrompt: post.imagePrompt,
          imageBase64: base64,
          createdAt,
        });
        runLogger.info(`Saved local draft ${localDraft.postId}`, {
          agentId: agent.id,
          outputPath: localDraft.outputPath,
        });
        postRecord = {
          id: localDraft.postId,
          title: post.title,
          agentId: agent.id,
          createdAt,
          heroImageUrl: localDraft.imagePath,
        };
      } else {
        if (!wixClient) {
          throw new Error("Wix client is unavailable.");
        }
        const imageUpload = await uploadImageFromBase64(
          wixClient,
          `${agent.id}-${Date.now()}.png`,
          base64,
          image.mimeType
        );

        const payload = buildDraftPostPayload(
          post.title,
          post.bodyMarkdown,
          post.excerpt,
          config.BLOG_LANGUAGE,
          config.WIX_MEMBER_ID,
          imageUpload.url,
          parseIdList(config.BLOG_CATEGORY_IDS),
          parseIdList(config.BLOG_TAG_IDS)
        );

        const draft = await createDraftPost(wixClient, payload);
        const draftId = draft.draftPost?.id;
        if (!draftId) {
          throw new Error("Wix draft post creation failed.");
        }
        const publish = await publishDraftPost(wixClient, draftId);
        runLogger.info(`Published post ${publish.postId}`, { agentId: agent.id });
        postRecord = {
          id: publish.postId,
          title: post.title,
          agentId: agent.id,
          createdAt,
          ...(draft.draftPost?.url ? { wixUrl: draft.draftPost.url } : {}),
          ...(imageUpload.url ? { heroImageUrl: imageUpload.url } : {}),
        };
      }

      state.posts.push(postRecord);
      publishedPosts.push(postRecord);

      state.researchArtifacts.push({
        id: research.dossier.id,
        runId,
        agentId: agent.id,
        postId: postRecord.id,
        createdAt: research.dossier.createdAt,
        dossierPath: research.artifacts.dossierPath,
        summaryPath: research.artifacts.summaryPath,
        sourceCount: research.dossier.sources.length,
        supportedClaimCount: research.dossier.supportedClaims.length,
        droppedClaimCount: research.dossier.droppedClaims.length,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown post generation failure";
      failures.push({ agentId: agent.id, reason });
      runLogger.error(`Post generation failed for ${agent.name}: ${reason}`);
    }
  }

  saveState(config.STATE_PATH, state);
  if (publishedPosts.length === 0 && failures.length > 0) {
    throw new Error(`Post command failed: ${failures.map((f) => `${f.agentId}: ${f.reason}`).join("; ")}`);
  }
  if (publishedPosts.length === 0 && failures.length === 0) {
    logger.info("No posts were published.");
  }
  return { publishedPosts, failures };
}

type SaveLocalDraftOptions = {
  outputRoot: string;
  agentId: string;
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  imagePrompt: string;
  imageBase64: string;
  createdAt: string;
};

type SaveLocalDraftResult = {
  postId: string;
  outputPath: string;
  imagePath: string;
};

async function saveLocalDraft(options: SaveLocalDraftOptions): Promise<SaveLocalDraftResult> {
  const postId = buildLocalPostId(options.agentId, options.createdAt);
  const outputPath = path.join(
    options.outputRoot,
    `${postId}-${toFileSegment(options.title).slice(0, 60)}`
  );
  const markdownPath = path.join(outputPath, "post.md");
  const imagePath = path.join(outputPath, "featured-image.png");
  const metadataPath = path.join(outputPath, "metadata.json");

  await fs.mkdir(outputPath, { recursive: true });
  await Promise.all([
    fs.writeFile(markdownPath, options.bodyMarkdown, "utf8"),
    fs.writeFile(imagePath, Buffer.from(options.imageBase64, "base64")),
    fs.writeFile(
      metadataPath,
      JSON.stringify(
        {
          mode: "local-only",
          postId,
          agentId: options.agentId,
          title: options.title,
          excerpt: options.excerpt,
          imagePrompt: options.imagePrompt,
          createdAt: options.createdAt,
          markdownPath,
          imagePath,
        },
        null,
        2
      ),
      "utf8"
    ),
  ]);

  return { postId, outputPath, imagePath };
}

function buildLocalPostId(agentId: string, createdAt: string): string {
  const timestamp = createdAt.replace(/[-:.TZ]/g, "").slice(0, 14);
  return `local-${toFileSegment(agentId)}-${timestamp}`;
}

function toFileSegment(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : "post";
}
