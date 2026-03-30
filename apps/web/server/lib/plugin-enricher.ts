export interface PluginMeta {
  name: string;
  marketplace: string;
  github_stars: number | null;
  github_url: string | null;
}

export interface SkillMeta {
  name: string;
  skills_sh_url: string | null;
}

interface PluginInput {
  name: string;
  marketplace: string;
}

interface SkillInput {
  name: string;
  source: string;
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
  if (typeof entry.source === "object" && entry.source.url) {
    const url = entry.source.url;
    const fullMatch = url.match(/github\.com\/([^/]+\/[^/.]+)/);
    if (fullMatch) return fullMatch[1];
    if (url.match(/^[^/]+\/[^/]+$/)) return url;
  }

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

export async function enrichPlugins(
  plugins: PluginInput[],
): Promise<PluginMeta[]> {
  if (plugins.length === 0) return [];

  const marketplaces = [...new Set(plugins.map((p) => p.marketplace))];
  const manifestEntries = await Promise.all(
    marketplaces.map(async (m) => [m, await fetchMarketplaceManifest(m)] as const),
  );
  const manifests = new Map(manifestEntries);

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

      return {
        name: plugin.name,
        marketplace: plugin.marketplace,
        github_stars,
        github_url,
      };
    }),
  );

  return results;
}

async function checkSkillsShUrl(
  skillName: string,
  marketplace: string,
): Promise<string | null> {
  const info = MARKETPLACE_GITHUB_ORGS[marketplace];
  if (!info) return null;

  const url = `https://skills.sh/${info.org}/${info.repo}/${skillName}`;
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    return res.ok ? url : null;
  } catch {
    return null;
  }
}

export async function enrichSkills(
  skills: SkillInput[],
  pluginMarketplaces: string[],
): Promise<SkillMeta[]> {
  if (skills.length === 0) return [];

  // Try each known marketplace for each skill
  const knownMarketplaces = [...new Set(pluginMarketplaces)].filter(
    (m) => MARKETPLACE_GITHUB_ORGS[m],
  );

  const results = await Promise.all(
    skills.map(async (skill): Promise<SkillMeta> => {
      // Try each marketplace to find the skill on skills.sh
      for (const marketplace of knownMarketplaces) {
        const url = await checkSkillsShUrl(skill.name, marketplace);
        if (url) return { name: skill.name, skills_sh_url: url };
      }
      return { name: skill.name, skills_sh_url: null };
    }),
  );

  return results;
}
