import fs from "node:fs";
import path from "node:path";
import { BotState } from "./types.js";

const defaultState: BotState = {
  version: 2,
  posts: [],
  comments: [],
  agents: [],
  humans: [],
  researchArtifacts: [],
  runHistory: [],
  debates: [],
};

export function loadState(statePath: string): BotState {
  if (!fs.existsSync(statePath)) {
    return { ...defaultState };
  }
  const raw = fs.readFileSync(statePath, "utf8");
  const parsed = JSON.parse(raw) as Partial<BotState> & { version?: number };
  if ((parsed.version ?? 1) <= 1) {
    const migrated = migrateV1ToV2(parsed);
    return { ...defaultState, ...migrated };
  }
  return { ...defaultState, ...parsed };
}

export function saveState(statePath: string, state: BotState): void {
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function migrateV1ToV2(raw: Partial<BotState> & { version?: number }): BotState {
  return {
    version: 2,
    posts: raw.posts ?? [],
    comments: raw.comments ?? [],
    agents: raw.agents ?? [],
    humans: raw.humans ?? [],
    researchArtifacts: [],
    runHistory: [],
    debates: [],
  };
}
