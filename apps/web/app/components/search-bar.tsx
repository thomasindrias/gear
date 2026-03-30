"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const FILTER_TAGS = [
  "claude-code",
  "gemini-cli",
  "frontend",
  "backend",
  "data-science",
  "devops",
];

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    router.push(`/?${params.toString()}`);
  };

  const handleTag = (tag: string) => {
    const params = new URLSearchParams(searchParams);
    const existing = params.get("tags")?.split(",") ?? [];
    if (existing.includes(tag)) {
      const filtered = existing.filter((t) => t !== tag);
      if (filtered.length) params.set("tags", filtered.join(","));
      else params.delete("tags");
    } else {
      params.set("tags", [...existing.filter(Boolean), tag].join(","));
    }
    router.push(`/?${params.toString()}`);
  };

  const activeTags = searchParams.get("tags")?.split(",").filter(Boolean) ?? [];

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search gears..."
          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/50 font-mono"
        />
      </form>
      <div className="flex flex-wrap gap-2 mt-3 justify-center">
        {FILTER_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => handleTag(tag)}
            className={`text-xs px-3 py-1 rounded-full border transition ${
              activeTags.includes(tag)
                ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                : "bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-500"
            }`}
          >
            #{tag}
          </button>
        ))}
      </div>
    </div>
  );
}
