"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

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

  return (
    <form onSubmit={handleSubmit} className="relative">
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
    </form>
  );
}
