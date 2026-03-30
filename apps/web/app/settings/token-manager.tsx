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

  useEffect(() => { loadTokens(); }, []);

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
      <h2 className="text-lg font-semibold">CLI Tokens</h2>
      <p className="text-sm text-neutral-400">
        Generate a personal access token to authenticate the Gear CLI.
      </p>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          value={newTokenName}
          onChange={(e) => setNewTokenName(e.target.value)}
          placeholder="Token name (e.g., MacBook Pro)"
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/50"
        />
        <button
          type="submit"
          className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 rounded-lg px-4 py-2 text-sm transition"
        >
          Generate Token
        </button>
      </form>

      {createdToken && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <p className="text-sm text-green-400 mb-2">
            Token created! Copy it now — you won&apos;t see it again.
          </p>
          <code className="block bg-neutral-900 rounded px-3 py-2 text-sm font-mono text-green-300 break-all">
            {createdToken}
          </code>
          <p className="text-xs text-neutral-500 mt-2">
            Run: <code className="text-amber-400">gear login {createdToken}</code>
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading tokens...</p>
      ) : tokens.length === 0 ? (
        <p className="text-sm text-neutral-500">No tokens yet.</p>
      ) : (
        <div className="space-y-2">
          {tokens.map((token) => (
            <div
              key={token.id}
              className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3"
            >
              <div>
                <span className="text-sm font-medium">{token.name}</span>
                <span className="text-xs text-neutral-500 ml-3">
                  Created {new Date(token.created_at).toLocaleDateString()}
                </span>
                {token.last_used_at && (
                  <span className="text-xs text-neutral-600 ml-3">
                    Last used {new Date(token.last_used_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleRevoke(token.id)}
                className="text-xs text-red-400 hover:text-red-300 transition"
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
