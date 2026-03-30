"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="max-w-5xl mx-auto px-6 py-20 text-center">
      <Link
        href="/"
        className="text-sm font-mono font-bold tracking-tight text-neutral-300 hover:text-white transition"
      >
        gear
      </Link>
      <h1 className="text-6xl font-black tracking-tighter font-mono text-neutral-300 mb-4 mt-12">
        500
      </h1>
      <p className="text-sm text-neutral-600 font-mono mb-6">
        Something went wrong.
      </p>
      <button
        onClick={reset}
        className="text-xs font-mono text-neutral-400 border border-neutral-800 px-4 py-2 rounded hover:border-neutral-600 hover:text-neutral-200 transition"
      >
        Try again
      </button>
    </main>
  );
}
