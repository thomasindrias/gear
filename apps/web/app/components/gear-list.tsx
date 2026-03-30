"use client";

import { useState, useEffect } from "react";
import { trpc } from "~/lib/trpc-client";

interface Gear {
  id: string;
  slug: string;
  name: string;
  is_public: boolean;
  downloads_count: number;
  users: { username: string } | { username: string }[];
}

function getUsername(users: Gear["users"]): string {
  if (Array.isArray(users)) return users[0]?.username ?? "";
  return users?.username ?? "";
}

export function GearList() {
  const [gears, setGears] = useState<Gear[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trpc.profile.listOwn
      .query()
      .then((data) => setGears(data as Gear[]))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (id: string) => {
    const result = await trpc.profile.toggleVisibility.mutate({ id });
    setGears((prev) =>
      prev.map((g) => (g.id === id ? { ...g, is_public: result.is_public } : g)),
    );
  };

  const handleDelete = async (slug: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await trpc.profile.delete.mutate({ slug });
      setGears((prev) => prev.filter((g) => g.slug !== slug));
    } catch {
      alert("Failed to delete gear. Please try again.");
    }
  };

  if (loading) {
    return <p className="text-sm text-neutral-600 font-mono animate-pulse">Loading...</p>;
  }

  if (gears.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-neutral-600 font-mono">
          No gears published yet.
        </p>
        <p className="text-xs text-neutral-700 font-mono mt-1">
          Use <code className="text-neutral-400">npx gearsh push</code> to publish one.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-neutral-800/20">
      {gears.map((gear) => (
        <div key={gear.id} className="flex items-center justify-between py-3.5 group">
          <div className="flex items-center gap-3 min-w-0">
            <a
              href={`/${getUsername(gear.users)}/${gear.slug}`}
              className="text-sm font-mono text-neutral-200 hover:text-white transition font-medium"
            >
              {gear.name}
            </a>
            <span className="text-xs text-neutral-700 font-mono hidden sm:inline">
              @{getUsername(gear.users)}/{gear.slug}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-neutral-700 font-mono tabular-nums hidden sm:inline">
              {gear.downloads_count} installs
            </span>
            <button
              onClick={() => handleToggle(gear.id)}
              className="flex items-center gap-1.5 text-xs font-mono transition rounded-md px-2 py-1 hover:bg-neutral-800/50"
            >
              <span className={`text-[8px] ${gear.is_public ? "text-emerald-400" : "text-amber-400"}`}>
                ●
              </span>
              <span className="text-neutral-500">
                {gear.is_public ? "Public" : "Private"}
              </span>
            </button>
            <button
              onClick={() => handleDelete(gear.slug, gear.name)}
              className="text-neutral-700 hover:text-red-400 transition p-1 rounded-md hover:bg-neutral-800/50"
              title="Delete gear"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
            <a
              href={`/${getUsername(gear.users)}/${gear.slug}`}
              className="text-neutral-700 hover:text-neutral-300 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
