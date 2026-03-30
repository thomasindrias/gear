interface Skill {
  name: string;
  source: string;
}

interface PluginMeta {
  name: string;
  marketplace: string;
  github_stars: number | null;
  github_url: string | null;
  skills_sh_url: string | null;
}

export function SkillPills({
  skills,
  pluginMeta,
}: {
  skills: Skill[];
  pluginMeta: PluginMeta[] | null;
}) {
  if (skills.length === 0) {
    return (
      <div>
        <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-3 border-b border-neutral-800/50 pb-2">
          Skills (0)
        </div>
        <p className="text-xs text-neutral-600 font-mono">No skills configured</p>
      </div>
    );
  }

  const metaByName = new Map(
    (pluginMeta ?? []).map((m) => [m.name, m]),
  );

  return (
    <div>
      <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-3 border-b border-neutral-800/50 pb-2">
        Skills ({skills.length})
      </div>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => {
          const meta = metaByName.get(skill.name);
          const url = meta?.skills_sh_url;

          if (url) {
            return (
              <a
                key={skill.name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded-md text-neutral-400 hover:border-neutral-600 hover:text-neutral-200 transition inline-flex items-center gap-1"
              >
                {skill.name}
                <span className="text-neutral-600 text-[10px]">↗</span>
              </a>
            );
          }

          return (
            <span
              key={skill.name}
              className="text-xs font-mono px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded-md text-neutral-500"
            >
              {skill.name}
            </span>
          );
        })}
      </div>
    </div>
  );
}
