// apps/web/server/lib/plugin-enricher.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { enrichPlugins, type PluginMeta } from "./plugin-enricher";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("enrichPlugins", () => {
  it("returns metadata with skills_sh_url when skills.sh responds 200", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    const result = await enrichPlugins([
      { name: "superpowers", marketplace: "claude-plugins-official" },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("superpowers");
    expect(result[0].skills_sh_url).toBe(
      "https://skills.sh/skills/claude-plugins-official/superpowers",
    );
  });

  it("returns null skills_sh_url when skills.sh responds 404", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    const result = await enrichPlugins([
      { name: "unknown-plugin", marketplace: "some-marketplace" },
    ]);

    expect(result[0].skills_sh_url).toBeNull();
  });

  it("returns null skills_sh_url on fetch error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await enrichPlugins([
      { name: "superpowers", marketplace: "claude-plugins-official" },
    ]);

    expect(result[0].skills_sh_url).toBeNull();
    expect(result[0].github_stars).toBeNull();
  });

  it("handles empty plugin list", async () => {
    const result = await enrichPlugins([]);
    expect(result).toEqual([]);
  });

  it("enriches multiple plugins in parallel", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    const result = await enrichPlugins([
      { name: "a", marketplace: "claude-plugins-official" },
      { name: "b", marketplace: "superpowers-marketplace" },
    ]);

    expect(result).toHaveLength(2);
  });
});
