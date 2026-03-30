"use client";

import { useState } from "react";

interface PluginMeta {
  name: string;
  marketplace: string;
  github_stars: number | null;
  skills_sh_url: string | null;
}

interface GearfilePlugin {
  name: string;
  marketplace: string;
}

function formatStars(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function PluginList({
  plugins,
  metadata,
}: {
  plugins: GearfilePlugin[];
  metadata: PluginMeta[] | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const INITIAL_SHOW = 5;

  if (plugins.length === 0) {
    return (
      <div>
        <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-3 border-b border-neutral-800/50 pb-2">
          Plugins (0)
        </div>
        <p className="text-xs text-neutral-600 font-mono">No plugins configured</p>
      </div>
    );
  }

  const metaMap = new Map(
    (metadata ?? []).map((m) => [`${m.name}:${m.marketplace}`, m]),
  );

  const visible = expanded ? plugins : plugins.slice(0, INITIAL_SHOW);
  const remaining = plugins.length - INITIAL_SHOW;

  return (
    <div>
      <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-3 border-b border-neutral-800/50 pb-2">
        Plugins ({plugins.length})
      </div>
      <div className="flex flex-col">
        {visible.map((plugin) => {
          const meta = metaMap.get(`${plugin.name}:${plugin.marketplace}`);
          return (
            <div
              key={`${plugin.name}:${plugin.marketplace}`}
              className="flex items-center justify-between py-2.5 px-1 border-b border-neutral-800/30 group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-neutral-200">
                  {plugin.name}
                </span>
                <span className="text-xs text-neutral-600 font-mono">
                  {plugin.marketplace}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {meta?.github_stars != null && (
                  <span className="text-xs text-neutral-600 font-mono flex items-center gap-1">
                    ★ {formatStars(meta.github_stars)}
                  </span>
                )}
                {meta?.skills_sh_url ? (
                  <a
                    href={meta.skills_sh_url}
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
          + {remaining} more plugin{remaining > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
