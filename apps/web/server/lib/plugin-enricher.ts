export interface PluginMeta {
  name: string;
  marketplace: string;
  github_stars: number | null;
  github_url: string | null;
  skills_sh_url: string | null;
}

interface PluginInput {
  name: string;
  marketplace: string;
}

interface MarketplaceEntry {
  name: string;
  source: string | { source: string; url: string; path?: string };
  homepage?: string;
}

const FETCH_TIMEOUT = 5000;

const MARKETPLACE_MANIFEST_URLS: Record<string, string> = {
  "claude-plugins-official":
    "https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/.claude-plugin/marketplace.json",
  "superpowers-marketplace":
    "https://raw.githubusercontent.com/obra/superpowers-marketplace/main/.claude-plugin/marketplace.json",
};

const MARKETPLACE_GITHUB_ORGS: Record<string, { org: string; repo: string }> = {
  "claude-plugins-official": { org: "anthropics", repo: "claude-plugins-official" },
  "superpowers-marketplace": { org: "obra", repo: "superpowers-marketplace" },
};

function extractGitHubRepo(entry: MarketplaceEntry): string | null {
  // Try source.url first (external plugins)
  if (typeof entry.source === "object" && entry.source.url) {
    const url = entry.source.url;
    // Handle full GitHub URLs: https://github.com/owner/repo.git
    const fullMatch = url.match(
      /github\.com\/([^/]+\/[^/.]+)/,
    );
    if (fullMatch) return fullMatch[1];
    // Handle short form: owner/repo
    if (url.match(/^[^/]+\/[^/]+$/)) return url;
  }

  // Try homepage
  if (entry.homepage) {
    const match = entry.homepage.match(
      /github\.com\/([^/]+\/[^/]+?)(?:\/|\.git|$)/,
    );
    if (match) return match[1];
  }

  return null;
}

async function fetchMarketplaceManifest(
  marketplace: string,
): Promise<Map<string, MarketplaceEntry>> {
  const url = MARKETPLACE_MANIFEST_URLS[marketplace];
  if (!url) return new Map();

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    if (!res.ok) return new Map();
    const data = await res.json();

    const plugins: MarketplaceEntry[] = Array.isArray(data.plugins || data)
      ? (data.plugins || data)
      : Object.values(data.plugins || data);

    const map = new Map<string, MarketplaceEntry>();
    for (const p of plugins) {
      if (p.name) map.set(p.name, p);
    }
    return map;
  } catch {
    return new Map();
  }
}

async function fetchGitHubStars(repoPath: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoPath}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.stargazers_count === "number" ? data.stargazers_count : null;
  } catch {
    return null;
  }
}

function buildSkillsShUrl(
  pluginName: string,
  marketplace: string,
  githubRepo: string | null,
): string | null {
  // skills.sh URL format: /{org}/{repo}/{plugin-name}
  // First try using the marketplace org/repo as the skills.sh path
  const marketplaceInfo = MARKETPLACE_GITHUB_ORGS[marketplace];
  if (marketplaceInfo) {
    return `https://skills.sh/${marketplaceInfo.org}/${marketplaceInfo.repo}/${pluginName}`;
  }
  // For unknown marketplaces, try the GitHub repo if we have one
  if (githubRepo) {
    return `https://skills.sh/${githubRepo}/${pluginName}`;
  }
  return null;
}

export async function enrichPlugins(
  plugins: PluginInput[],
): Promise<PluginMeta[]> {
  if (plugins.length === 0) return [];

  // Fetch all unique marketplace manifests in parallel
  const marketplaces = [...new Set(plugins.map((p) => p.marketplace))];
  const manifestEntries = await Promise.all(
    marketplaces.map(async (m) => [m, await fetchMarketplaceManifest(m)] as const),
  );
  const manifests = new Map(manifestEntries);

  // Enrich each plugin in parallel
  const results = await Promise.all(
    plugins.map(async (plugin): Promise<PluginMeta> => {
      const manifest = manifests.get(plugin.marketplace);
      const entry = manifest?.get(plugin.name);

      let github_url: string | null = null;
      let github_stars: number | null = null;

      if (entry) {
        const repoPath = extractGitHubRepo(entry);
        if (repoPath) {
          github_url = `https://github.com/${repoPath}`;
          github_stars = await fetchGitHubStars(repoPath);
        }
      }

      const skills_sh_url = buildSkillsShUrl(
        plugin.name,
        plugin.marketplace,
        null,
      );

      return {
        name: plugin.name,
        marketplace: plugin.marketplace,
        github_stars,
        github_url,
        skills_sh_url,
      };
    }),
  );

  return results;
}
