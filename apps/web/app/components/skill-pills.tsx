"use client";

import { useState } from "react";

interface Skill {
  name: string;
  source: string;
}

interface SkillMeta {
  name: string;
  skills_sh_url: string | null;
}

const INITIAL_SHOW = 5;

export function SkillPills({
  skills,
  skillMeta,
}: {
  skills: Skill[];
  skillMeta: SkillMeta[] | null;
}) {
  const [expanded, setExpanded] = useState(false);

  if (skills.length === 0) return null;

  const metaByName = new Map(
    (skillMeta ?? []).map((m) => [m.name, m]),
  );

  const visible = expanded ? skills : skills.slice(0, INITIAL_SHOW);
  const remaining = skills.length - INITIAL_SHOW;

  return (
    <div>
      <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-3 border-b border-neutral-800/40 pb-2">
        Skills ({skills.length})
      </div>
      <div className="flex flex-col">
        {visible.map((skill) => {
          const meta = metaByName.get(skill.name);
          const url = meta?.skills_sh_url;

          return (
            <div
              key={skill.name}
              className="flex items-center justify-between py-2.5 px-1 border-b border-neutral-800/30 group"
            >
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-neutral-200 hover:text-white transition"
                >
                  {skill.name}
                </a>
              ) : (
                <span className="text-sm font-semibold text-neutral-200">
                  {skill.name}
                </span>
              )}
              <div className="flex items-center gap-3">
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-neutral-500 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded font-mono hover:border-neutral-600 hover:text-neutral-300 transition"
                  >
                    skills.sh ↗
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {!expanded && remaining > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-neutral-600 font-mono mt-2 hover:text-neutral-400 transition"
        >
          + {remaining} more skill{remaining > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
