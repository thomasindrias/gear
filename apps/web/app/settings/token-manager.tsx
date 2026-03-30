"use client";

import { useState, useEffect } from "react";
import { trpc } from "~/lib/trpc-client";

interface Token {
  id: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
}

export function TokenManager() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [newTokenName, setNewTokenName] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTokens = async () => {
    setLoading(true);
    const data = await trpc.token.list.query();
    setTokens(data);
    setLoading(false);
  };

  useEffect(() => {
    loadTokens();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;
    const result = await trpc.token.create.mutate({ name: newTokenName });
    setCreatedToken(result.token);
    setNewTokenName("");
    loadTokens();
  };

  const handleRevoke = async (id: string) => {
    await trpc.token.revoke.mutate({ id });
    loadTokens();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-2">
          CLI Tokens
        </h2>
        <p className="text-sm text-neutral-500">
          Generate a personal access token to authenticate the Gear CLI.
        </p>
      </div>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          value={newTokenName}
          onChange={(e) => setNewTokenName(e.target.value)}
          placeholder="Token name (e.g., MacBook Pro)"
          className="flex-1 bg-transparent border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 font-mono transition"
        />
        <button
          type="submit"
          className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 rounded-lg px-4 py-2.5 text-sm font-mono transition"
        >
          Generate
        </button>
      </form>

      {createdToken && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <p className="text-sm text-neutral-300 mb-2 font-mono">
            Token created — copy it now, you won&apos;t see it again.
          </p>
          <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded px-3 py-2.5">
            <code className="flex-1 text-sm font-mono text-neutral-200 break-all">
              {createdToken}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(createdToken);
              }}
              className="shrink-0 text-neutral-600 hover:text-neutral-300 transition p-1"
              title="Copy token"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-neutral-600 mt-2 font-mono">
            Run: <span className="text-neutral-400">gear login {createdToken}</span>
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-600 font-mono">Loading...</p>
      ) : tokens.length === 0 ? (
        <p className="text-sm text-neutral-600 font-mono">No tokens yet.</p>
      ) : (
        <div className="divide-y divide-neutral-800/30">
          {tokens.map((token) => (
            <div
              key={token.id}
              className="flex items-center justify-between py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-neutral-200">
                  {token.name}
                </span>
                <span className="text-xs text-neutral-600 font-mono">
                  {new Date(token.created_at).toLocaleDateString()}
                </span>
                {token.last_used_at && (
                  <span className="text-xs text-neutral-700 font-mono">
                    used {new Date(token.last_used_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleRevoke(token.id)}
                className="text-xs text-neutral-600 hover:text-red-400 font-mono transition"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
