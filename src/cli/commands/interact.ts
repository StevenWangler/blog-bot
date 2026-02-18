import { runPostCommand } from "./post.js";
import { runCommentCommand } from "./comment.js";
import { runRespondCommand } from "./respond.js";

export async function runInteractCommand(): Promise<void> {
  await runPostCommand();
  await runCommentCommand();
  await runRespondCommand();
}
