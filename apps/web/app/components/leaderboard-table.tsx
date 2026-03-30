"use client";

import { useState } from "react";
import { AGENT_ICONS } from "./icons";

interface Profile {
  id: string;
  slug: string;
  name: string;
  description: string;
  tags: string[];
  compatibility: string[];
  downloads_count: number;
  created_at: string;
  users: {
    username: string;
    avatar_url: string | null;
  };
}

type SortMode = "all" | "trending" | "new";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function LeaderboardTable({
  profiles,
}: {
  profiles: Profile[] | null;
}) {
  const [sort, setSort] = useState<SortMode>("all");

  const sorted = [...(profiles ?? [])].sort((a, b) => {
    if (sort === "new") {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return b.downloads_count - a.downloads_count;
  });

  const total = profiles?.length ?? 0;

  return (
    <div className="mt-6 min-h-[300px]">
      {/* Sort tabs */}
      <div className="flex items-center gap-6 mb-6 border-b border-neutral-800/40 pb-3">
        <SortTab
          active={sort === "all"}
          onClick={() => setSort("all")}
          label={`All Time (${total.toLocaleString()})`}
        />
        <SortTab
          active={sort === "trending"}
          onClick={() => setSort("trending")}
          label="Trending (24h)"
        />
        <SortTab
          active={sort === "new"}
          onClick={() => setSort("new")}
          label="New"
        />
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[2.5rem_1fr_auto] items-center px-2 py-2 text-[11px] font-mono text-neutral-600 uppercase tracking-wider">
        <span>#</span>
        <span>Gear</span>
        <span className="text-right">Installs</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-neutral-800/30">
        {sorted.map((profile, i) => (
          <a
            key={profile.id}
            href={`/${profile.users.username}/${profile.slug}`}
            className="grid grid-cols-[2.5rem_1fr_auto] items-center px-3 py-3.5 hover:bg-neutral-900/40 transition-colors group rounded-lg"
          >
            <span className="text-sm font-mono text-neutral-600 tabular-nums">
              {i + 1}
            </span>
            <div className="flex items-center gap-3 min-w-0">
              {profile.users.avatar_url ? (
                <img
                  src={profile.users.avatar_url}
                  alt=""
                  className="w-6 h-6 rounded-full shrink-0 opacity-50 group-hover:opacity-100 transition"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-neutral-800 shrink-0" />
              )}
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className="text-sm font-semibold text-neutral-200 group-hover:text-white transition">
                  {profile.name}
                </span>
                <span className="text-sm text-neutral-600 font-mono">
                  @{profile.users.username}/{profile.slug}
                </span>
                {profile.compatibility.length > 0 && (
                  <span className="hidden md:inline-flex items-center gap-2 ml-1">
                    {profile.compatibility.map((p) => {
                      const Icon = AGENT_ICONS[p];
                      return Icon ? (
                        <Icon
                          key={p}
                          size={13}
                          className="text-neutral-700 group-hover:text-neutral-500 transition"
                        />
                      ) : null;
                    })}
                  </span>
                )}
              </div>
            </div>
            <span className="text-sm font-mono text-neutral-500 text-right tabular-nums">
              {formatCount(profile.downloads_count)}
            </span>
          </a>
        ))}
      </div>

      {(!profiles || profiles.length === 0) && (
        <div className="text-center py-16 text-neutral-600">
          <p className="text-sm font-mono">No gears found yet.</p>
          <p className="text-sm font-mono mt-1">
            Be the first —{" "}
            <code className="text-neutral-400">npx gearsh push</code>
          </p>
        </div>
      )}
    </div>
  );
}

function SortTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-sm font-mono transition ${
        active
          ? "text-neutral-100 underline underline-offset-[14px] decoration-neutral-400"
          : "text-neutral-600 hover:text-neutral-400"
      }`}
    >
      {label}
    </button>
  );
}
