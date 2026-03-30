"use client";

import { useState, useEffect } from "react";
import { trpc } from "~/lib/trpc-client";
import { CopyButton } from "~/app/components/copy-button";

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
    <div className="space-y-5">
      <p className="text-sm text-neutral-500">
        Generate a personal access token to authenticate the Gear CLI.
      </p>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          value={newTokenName}
          onChange={(e) => setNewTokenName(e.target.value)}
          placeholder="Token name (e.g., MacBook Pro)"
          className="flex-1 bg-neutral-950 border border-neutral-800/60 rounded-lg px-3 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 font-mono transition"
        />
        <button
          type="submit"
          className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/60 text-neutral-200 rounded-lg px-4 py-2.5 text-sm font-mono transition"
        >
          Generate
        </button>
      </form>

      {createdToken && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-sm text-neutral-300 mb-2 font-mono">
            Token created — copy it now, you won&apos;t see it again.
          </p>
          <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800/50 rounded-lg px-3 py-2.5">
            <code className="flex-1 text-sm font-mono text-neutral-200 break-all">
              {createdToken}
            </code>
            <CopyButton text={createdToken} />
          </div>
          <p className="text-xs text-neutral-600 mt-2 font-mono">
            Run: <span className="text-neutral-400">npx gearsh login {createdToken}</span>
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-600 font-mono animate-pulse">Loading...</p>
      ) : tokens.length === 0 ? (
        <p className="text-sm text-neutral-600 font-mono">No tokens yet.</p>
      ) : (
        <div className="divide-y divide-neutral-800/20">
          {tokens.map((token) => (
            <div key={token.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-neutral-200">
                  {token.name}
                </span>
                <span className="text-xs text-neutral-700 font-mono">
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
