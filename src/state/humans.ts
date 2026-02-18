import { BotState, HumanProfile } from "./types.js";

export function upsertHuman(state: BotState, profile: HumanProfile): void {
  const existing = state.humans.find((human) => human.id === profile.id);
  if (existing) {
    if (profile.displayName) {
      existing.displayName = profile.displayName;
    }
    existing.lastSeenAt = profile.lastSeenAt;
    return;
  }
  state.humans.push(profile);
}

export function isKnownHuman(state: BotState, authorId: string): boolean {
  return state.humans.some((human) => human.id === authorId);
}
