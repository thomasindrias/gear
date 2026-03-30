"use client";

import { Nav } from "~/app/components/nav";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-black tracking-tighter font-mono text-neutral-300 mb-4">
          Something went wrong
        </h1>
        <p className="text-sm text-neutral-600 font-mono mb-6">
          Could not load this gear profile.
        </p>
        <button
          onClick={reset}
          className="text-xs font-mono text-neutral-400 border border-neutral-800 px-4 py-2 rounded hover:border-neutral-600 hover:text-neutral-200 transition"
        >
          Try again
        </button>
      </main>
    </>
  );
}
