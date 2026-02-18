export type LogLevel = "debug" | "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function getLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL?.toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return "info";
}

const activeLevel = getLevel();

export function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (levelOrder[level] < levelOrder[activeLevel]) return;
  const prefix = level.toUpperCase().padEnd(5);
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  process.stdout.write(`[${prefix}] ${message}${suffix}\n`);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};

export function createRunLogger(runId: string): typeof logger {
  const withRunId = (meta?: Record<string, unknown>) => ({ runId, ...(meta ?? {}) });
  return {
    debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, withRunId(meta)),
    info: (message: string, meta?: Record<string, unknown>) => log("info", message, withRunId(meta)),
    warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, withRunId(meta)),
    error: (message: string, meta?: Record<string, unknown>) => log("error", message, withRunId(meta)),
  };
}
