import { describe, it, expect, vi, beforeEach } from "vitest";
import { enrichPlugins, enrichSkills } from "./plugin-enricher";

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

  it("does not include skills_sh_url on plugins", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("marketplace.json")) {
        return Promise.resolve(mockMarketplaceResponse([{ name: "test", source: "./plugins/test" }]));
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const result = await enrichPlugins([
      { name: "test", marketplace: "claude-plugins-official" },
    ]);

    expect(result[0]).not.toHaveProperty("skills_sh_url");
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

  it("handles empty plugin list", async () => {
    const result = await enrichPlugins([]);
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("enrichSkills", () => {
  it("returns skills_sh_url when HEAD request succeeds", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("skills.sh")) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const result = await enrichSkills(
      [{ name: "web-design-guidelines", source: "marketplace" }],
      ["claude-plugins-official"],
    );

    expect(result[0].skills_sh_url).toBe(
      "https://skills.sh/anthropics/claude-plugins-official/web-design-guidelines",
    );
  });

  it("returns null when skill not found on skills.sh", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    const result = await enrichSkills(
      [{ name: "nonexistent", source: "marketplace" }],
      ["claude-plugins-official"],
    );

    expect(result[0].skills_sh_url).toBeNull();
  });

  it("handles empty skills list", async () => {
    const result = await enrichSkills([], []);
    expect(result).toEqual([]);
  });

  it("tries multiple marketplaces for each skill", async () => {
    const tried: string[] = [];
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("skills.sh")) {
        tried.push(url);
        if (url.includes("superpowers-marketplace")) {
          return Promise.resolve({ ok: true, status: 200 });
        }
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const result = await enrichSkills(
      [{ name: "remembering", source: "marketplace" }],
      ["claude-plugins-official", "superpowers-marketplace"],
    );

    expect(result[0].skills_sh_url).toBe(
      "https://skills.sh/obra/superpowers-marketplace/remembering",
    );
  });
});
