import { Command } from "commander";
import { runPostCommand } from "./commands/post.js";
import { runCommentCommand } from "./commands/comment.js";
import { runInteractCommand } from "./commands/interact.js";
import { runStatusCommand } from "./commands/status.js";
import { runRespondCommand } from "./commands/respond.js";

function parsePositiveInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Expected a positive integer but received "${value}".`);
  }
  return parsed;
}

export function createCli(): Command {
  const program = new Command();
  program.name("blog-bot").description("AI agent community for Wix blog posts.");

  program
    .command("post")
    .description("Generate a blog post with a featured image, and optionally publish to Wix.")
    .option(
      "--ignore-schedule",
      "Run immediately without checking agent cron schedules."
    )
    .option(
      "--max-posts <count>",
      "Maximum number of posts to publish in this run.",
      parsePositiveInt
    )
    .option("--agent-id <agentId>", "Only publish a post from the specified agent.")
    .option(
      "--local-only",
      "Generate locally and save draft artifacts to disk without posting to Wix."
    )
    .option(
      "--local-drafts-path <path>",
      "Local draft output directory (used with --local-only)."
    )
    .action(
      async (options: {
        ignoreSchedule?: boolean;
        maxPosts?: number;
        agentId?: string;
        localOnly?: boolean;
        localDraftsPath?: string;
      }) => {
        await runPostCommand({
          ...(options.ignoreSchedule ? { skipSchedule: true } : {}),
          ...(typeof options.maxPosts === "number" ? { maxPosts: options.maxPosts } : {}),
          ...(options.agentId ? { forceAgentIds: [options.agentId] } : {}),
          ...(options.localOnly ? { localOnly: true } : {}),
          ...(options.localDraftsPath ? { localDraftsPath: options.localDraftsPath } : {}),
        });
      }
    );

  program
    .command("comment")
    .description("Have agents comment on recent posts.")
    .option("--post-id <postId>", "Target a specific post ID.")
    .option(
      "--max-rounds <count>",
      "Maximum number of discussion rounds for this run.",
      parsePositiveInt
    )
    .action(async (options: { postId?: string; maxRounds?: number }) => {
      await runCommentCommand({
        ...(options.postId ? { postId: options.postId } : {}),
        ...(typeof options.maxRounds === "number" ? { maxRounds: options.maxRounds } : {}),
      });
    });

  program
    .command("respond")
    .description("Respond to new human comments.")
    .action(async () => {
      await runRespondCommand();
    });

  program
    .command("interact")
    .description("Run full cycle: post + comments + human replies.")
    .action(runInteractCommand);

  program
    .command("status")
    .description("Show recent activity summary.")
    .action(runStatusCommand);

  return program;
}
