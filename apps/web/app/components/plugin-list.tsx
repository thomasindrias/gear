"use client";

import { useState } from "react";

interface PluginMeta {
  name: string;
  marketplace: string;
  github_stars: number | null;
  github_url: string | null;
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
                {meta?.github_url && (
                  <a
                    href={meta.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-neutral-500 font-mono hover:text-neutral-300 transition"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
                    </svg>
                    {meta.github_stars != null && formatStars(meta.github_stars)}
                  </a>
                )}
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
