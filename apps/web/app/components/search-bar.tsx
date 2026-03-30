"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "~/lib/trpc-client";

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

interface SearchBarProps {
  onResults: (profiles: Profile[] | null, isSearching: boolean) => void;
  initialProfiles: Profile[];
}

export function SearchBar({ onResults, initialProfiles }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        onResults(initialProfiles, false);
        return;
      }

      onResults(null, true);
      abortRef.current = false;

      try {
        const result = await trpc.profile.search.query({ query: q.trim() });
        if (!abortRef.current) {
          onResults(result.items as Profile[], false);
        }
      } catch {
        if (!abortRef.current) {
          onResults(initialProfiles, false);
        }
      }
    },
    [initialProfiles, onResults],
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current = true;

    if (!query.trim()) {
      onResults(initialProfiles, false);
      return;
    }

    timerRef.current = setTimeout(() => {
      search(query);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search gears ..."
        className="w-full bg-neutral-950 border border-neutral-800/60 rounded-xl pl-11 pr-12 py-3 text-sm text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 font-mono transition"
      />
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-700 text-xs font-mono border border-neutral-800 rounded px-1.5 py-0.5">
        /
      </div>
    </div>
  );
}
