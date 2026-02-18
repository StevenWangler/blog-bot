import fs from "node:fs";
import path from "node:path";
import { AgentConfig } from "./types.js";

export function loadAgents(configDir: string): AgentConfig[] {
  if (!fs.existsSync(configDir)) {
    return [];
  }
  const entries = fs.readdirSync(configDir, { withFileTypes: true });
  const agents: AgentConfig[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const raw = fs.readFileSync(path.join(configDir, entry.name), "utf8");
    const agent = JSON.parse(raw) as AgentConfig;
    agents.push(agent);
  }
  return agents;
}
