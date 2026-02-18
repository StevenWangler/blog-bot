import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadState } from "../../src/state/store.js";

describe("loadState migration", () => {
  it("migrates v1 state to v2 while preserving existing records", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-bot-state-"));
    const statePath = path.join(dir, "state.json");
    fs.writeFileSync(
      statePath,
      JSON.stringify({
        version: 1,
        posts: [{ id: "p1", title: "post", agentId: "a1", createdAt: "2026-02-17T00:00:00.000Z" }],
        comments: [{ id: "c1", postId: "p1", authorId: "a1", authorType: "agent", createdAt: "2026-02-17T00:00:00.000Z" }],
        humans: [{ id: "h1", lastSeenAt: "2026-02-17T00:00:00.000Z" }],
      })
    );

    const state = loadState(statePath);
    expect(state.version).toBe(2);
    expect(state.posts).toHaveLength(1);
    expect(state.comments).toHaveLength(1);
    expect(state.humans).toHaveLength(1);
    expect(state.researchArtifacts).toEqual([]);
    expect(state.runHistory).toEqual([]);
    expect(state.debates).toEqual([]);
  });
});
