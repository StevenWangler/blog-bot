import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/utils/config.js";

describe("loadConfig", () => {
  it("requires Wix credentials by default", () => {
    expect(() => loadConfig({ OPENAI_API_KEY: "test-key" })).toThrow(
      /Missing required Wix values/
    );
  });

  it("allows missing Wix credentials when requireWix is false", () => {
    const config = loadConfig({ OPENAI_API_KEY: "test-key" }, { requireWix: false });
    expect(config.WIX_API_TOKEN).toBe("");
    expect(config.WIX_SITE_ID).toBe("");
    expect(config.WIX_MEMBER_ID).toBe("");
    expect(config.LOCAL_DRAFTS_PATH).toBe("./data/local-drafts");
  });
});
