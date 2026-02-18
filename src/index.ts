import "dotenv/config";
import { createCli } from "./cli/index.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  const cli = createCli();
  await cli.parseAsync(process.argv);
}

main().catch((error) => {
  logger.error(error instanceof Error ? error.message : "Unexpected error");
  process.exitCode = 1;
});
