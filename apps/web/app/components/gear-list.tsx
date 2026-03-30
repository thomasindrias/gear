// apps/web/app/components/gear-list.tsx
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

  if (loading) {
    return <p className="text-sm text-neutral-600 font-mono">Loading...</p>;
  }

  if (gears.length === 0) {
    return (
      <p className="text-sm text-neutral-600 font-mono">
        No gears published yet. Use <code className="text-neutral-400">gear push</code> to publish one.
      </p>
    );
  }

  return (
    <div className="divide-y divide-neutral-800/30">
      {gears.map((gear) => (
        <div key={gear.id} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3 min-w-0">
            <a
              href={`/${getUsername(gear.users)}/${gear.slug}`}
              className="text-sm font-mono text-neutral-200 hover:text-white transition"
            >
              {gear.name}
            </a>
            <span className="text-xs text-neutral-600 font-mono">
              @{getUsername(gear.users)}/{gear.slug}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-neutral-600 font-mono tabular-nums">
              {gear.downloads_count} installs
            </span>
            <button
              onClick={() => handleToggle(gear.id)}
              className="flex items-center gap-1.5 text-xs font-mono transition"
            >
              <span className={gear.is_public ? "text-green-400" : "text-amber-400"}>
                ●
              </span>
              <span className="text-neutral-500">
                {gear.is_public ? "Public" : "Private"}
              </span>
            </button>
            <a
              href={`/${getUsername(gear.users)}/${gear.slug}`}
              className="text-neutral-600 hover:text-neutral-300 transition"
            >
              →
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
