import { z } from "zod";
import { ConfigError } from "./errors.js";

const configSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-1"),
  RESEARCH_MODEL: z.string().default("gpt-4.1-mini"),
  WIX_API_TOKEN: z.string().optional().default(""),
  WIX_SITE_ID: z.string().optional().default(""),
  WIX_MEMBER_ID: z.string().optional().default(""),
  BLOG_LANGUAGE: z.string().default("en"),
  BLOG_CATEGORY_IDS: z.string().optional().default(""),
  BLOG_TAG_IDS: z.string().optional().default(""),
  STATE_PATH: z.string().default("./data/state.json"),
  RESEARCH_PATH: z.string().default("./data/research"),
  LOCAL_DRAFTS_PATH: z.string().default("./data/local-drafts"),
  MIN_SOURCES_PER_POST: z.coerce.number().int().min(1).default(5),
  MAX_SOURCE_AGE_DAYS: z.coerce.number().int().min(1).default(365),
  MAX_RESEARCH_ATTEMPTS: z.coerce.number().int().min(1).default(2),
  MAX_DEBATE_ROUNDS: z.coerce.number().int().min(1).max(10).default(3),
  SCHEDULE_TIMEZONE: z.string().default("America/New_York"),
  IMAGE_STYLE: z.string().optional().default("futuristic minimal, crisp, editorial, high contrast"),
  HUMAN_RESPONSE_MODE: z
    .enum(["single", "multi"])
    .optional()
    .default("single"),
});

export type AppConfig = z.infer<typeof configSchema>;

export type LoadConfigOptions = {
  requireWix?: boolean;
};

export function loadConfig(env = process.env, options: LoadConfigOptions = {}): AppConfig {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new ConfigError(`Invalid configuration: ${message}`);
  }

  if (options.requireWix ?? true) {
    const wixFields: Array<[string, string]> = [
      ["WIX_API_TOKEN", parsed.data.WIX_API_TOKEN ?? ""],
      ["WIX_SITE_ID", parsed.data.WIX_SITE_ID ?? ""],
      ["WIX_MEMBER_ID", parsed.data.WIX_MEMBER_ID ?? ""],
    ];
    const missing = wixFields
      .filter(([, value]) => value.trim().length === 0)
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new ConfigError(
        `Invalid configuration: Missing required Wix values (${missing.join(", ")}).`
      );
    }
  }

  return parsed.data;
}

export function parseIdList(raw: string): string[] {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}
