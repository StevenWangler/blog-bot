import { loadConfig } from "../../utils/config.js";
import { loadState } from "../../state/store.js";
import { logger } from "../../utils/logger.js";

export async function runStatusCommand(): Promise<void> {
  const config = loadConfig();
  const state = loadState(config.STATE_PATH);
  const lastPost = state.posts[state.posts.length - 1];
  logger.info(`Posts: ${state.posts.length}`);
  logger.info(`Comments: ${state.comments.length}`);
  logger.info(`Humans: ${state.humans.length}`);
  logger.info(`Research artifacts: ${state.researchArtifacts.length}`);
  logger.info(`Debates: ${state.debates.length}`);
  logger.info(`Run history: ${state.runHistory.length}`);
  if (lastPost) {
    logger.info(`Last post: ${lastPost.title}`, { id: lastPost.id });
  }
}
