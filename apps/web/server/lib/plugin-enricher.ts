// apps/web/server/lib/plugin-enricher.ts

export interface PluginMeta {
  name: string;
  marketplace: string;
  github_stars: number | null;
  skills_sh_url: string | null;
}

interface PluginInput {
  name: string;
  marketplace: string;
}

const FETCH_TIMEOUT = 5000;

async function checkSkillsSh(
  name: string,
  marketplace: string,
): Promise<string | null> {
  const url = `https://skills.sh/skills/${marketplace}/${name}`;
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

async function enrichOne(plugin: PluginInput): Promise<PluginMeta> {
  const skills_sh_url = await checkSkillsSh(plugin.name, plugin.marketplace);

  return {
    name: plugin.name,
    marketplace: plugin.marketplace,
    github_stars: null,
    skills_sh_url,
  };
}

export async function enrichPlugins(plugins: PluginInput[]): Promise<PluginMeta[]> {
  if (plugins.length === 0) return [];
  const results = await Promise.all(plugins.map(enrichOne));
  return results;
}
