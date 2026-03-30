"use client";

import { useState, useCallback } from "react";
import { SearchBar } from "./search-bar";
import { LeaderboardTable } from "./leaderboard-table";

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

export function ExploreSection({
  initialProfiles,
}: {
  initialProfiles: Profile[];
}) {
  const [profiles, setProfiles] = useState<Profile[] | null>(initialProfiles);
  const [isSearching, setIsSearching] = useState(false);

  const handleResults = useCallback(
    (results: Profile[] | null, searching: boolean) => {
      setProfiles(results);
      setIsSearching(searching);
    },
    [],
  );

  return (
    <>
      <SearchBar onResults={handleResults} initialProfiles={initialProfiles} />

      {isSearching ? (
        <div className="mt-6 text-center py-12">
          <div className="inline-block w-4 h-4 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
        </div>
      ) : (
        <LeaderboardTable profiles={profiles} />
      )}
    </>
  );
}
