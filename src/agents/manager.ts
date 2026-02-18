import { AgentConfig } from "./types.js";

export function pickAgent(agents: AgentConfig[], excludeIds: string[] = []): AgentConfig {
  const filtered = agents.filter((agent) => !excludeIds.includes(agent.id));
  if (filtered.length === 0) {
    throw new Error("No available agents to pick from.");
  }
  const index = Math.floor(Math.random() * filtered.length);
  const picked = filtered[index];
  if (!picked) {
    throw new Error("Failed to pick an agent.");
  }
  return picked;
}
