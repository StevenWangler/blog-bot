import cronParser from "cron-parser";
import { AgentConfig } from "./types.js";

export type SchedulerOptions = {
  timezone?: string;
  windowMs?: number;
};

export function selectDueAgents(
  agents: AgentConfig[],
  now = new Date(),
  options: SchedulerOptions = {}
): AgentConfig[] {
  return agents.filter((agent) => isDue(agent, now, options));
}

function isDue(agent: AgentConfig, now: Date, options: SchedulerOptions): boolean {
  const windowMs = options.windowMs ?? 5 * 60 * 1000;
  try {
    const interval = cronParser.parseExpression(agent.scheduleCron, {
      currentDate: now,
      ...(options.timezone ? { tz: options.timezone } : {}),
    });
    const prev = interval.prev().toDate();
    const diffMs = now.getTime() - prev.getTime();
    return diffMs >= 0 && diffMs < windowMs;
  } catch {
    return false;
  }
}
