import { describe, it, expect, vi, beforeEach } from "vitest";
import { enrichPlugins } from "./plugin-enricher";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

function mockMarketplaceResponse(plugins: Array<{ name: string; source: string | object; homepage?: string }>) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ plugins }),
  };
}

function mockGitHubResponse(stars: number) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ stargazers_count: stars }),
  };
}

describe("enrichPlugins", () => {
  it("fetches real GitHub stars from marketplace manifest", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("marketplace.json")) {
        return Promise.resolve(
          mockMarketplaceResponse([
            {
              name: "superpowers",
              source: { source: "url", url: "https://github.com/obra/superpowers.git" },
            },
          ]),
        );
      }
      if (url.includes("api.github.com/repos/obra/superpowers")) {
        return Promise.resolve(mockGitHubResponse(124000));
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const result = await enrichPlugins([
      { name: "superpowers", marketplace: "claude-plugins-official" },
    ]);

    expect(result[0].github_stars).toBe(124000);
    expect(result[0].github_url).toBe("https://github.com/obra/superpowers");
  });

  it("builds skills.sh URL using marketplace org/repo", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("marketplace.json")) {
        return Promise.resolve(mockMarketplaceResponse([{ name: "context7", source: "./external_plugins/context7" }]));
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const result = await enrichPlugins([
      { name: "context7", marketplace: "claude-plugins-official" },
    ]);

    expect(result[0].skills_sh_url).toBe(
      "https://skills.sh/anthropics/claude-plugins-official/context7",
    );
  });

  it("extracts GitHub repo from homepage when source is local", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("marketplace.json")) {
        return Promise.resolve(
          mockMarketplaceResponse([
            {
              name: "hookify",
              source: "./plugins/hookify",
              homepage: "https://github.com/anthropics/claude-plugins-public/tree/main/plugins/hookify",
            },
          ]),
        );
      }
      if (url.includes("api.github.com/repos/anthropics/claude-plugins-public")) {
        return Promise.resolve(mockGitHubResponse(5000));
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const result = await enrichPlugins([
      { name: "hookify", marketplace: "claude-plugins-official" },
    ]);

    expect(result[0].github_url).toBe("https://github.com/anthropics/claude-plugins-public");
    expect(result[0].github_stars).toBe(5000);
  });

  it("returns null stars when GitHub API fails", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("marketplace.json")) {
        return Promise.resolve(
          mockMarketplaceResponse([
            { name: "test", source: { source: "url", url: "https://github.com/foo/bar.git" } },
          ]),
        );
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const result = await enrichPlugins([
      { name: "test", marketplace: "claude-plugins-official" },
    ]);

    expect(result[0].github_stars).toBeNull();
    expect(result[0].github_url).toBe("https://github.com/foo/bar");
  });

  it("returns nulls when marketplace manifest fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await enrichPlugins([
      { name: "superpowers", marketplace: "claude-plugins-official" },
    ]);

    expect(result[0].github_stars).toBeNull();
    expect(result[0].github_url).toBeNull();
  });

  it("handles empty plugin list", async () => {
    const result = await enrichPlugins([]);
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches each marketplace manifest only once for multiple plugins", async () => {
    const manifestCalls: string[] = [];
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("marketplace.json")) {
        manifestCalls.push(url);
        return Promise.resolve(
          mockMarketplaceResponse([
            { name: "a", source: "./plugins/a" },
            { name: "b", source: "./plugins/b" },
          ]),
        );
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    await enrichPlugins([
      { name: "a", marketplace: "claude-plugins-official" },
      { name: "b", marketplace: "claude-plugins-official" },
    ]);

    // Should fetch marketplace.json only once despite two plugins from same marketplace
    expect(manifestCalls).toHaveLength(1);
  });

  it("returns null for unknown marketplace", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    const result = await enrichPlugins([
      { name: "something", marketplace: "unknown-marketplace" },
    ]);

    expect(result[0].github_stars).toBeNull();
    expect(result[0].skills_sh_url).toBeNull();
  });
});
