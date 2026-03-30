"use client";

import { useState } from "react";
import { trpc } from "~/lib/trpc-client";

export function VisibilityToggle({
  profileId,
  initialValue,
  isOwner,
}: {
  profileId: string;
  initialValue: boolean;
  isOwner: boolean;
}) {
  const [isPublic, setIsPublic] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!isOwner) return;
    setLoading(true);
    try {
      const result = await trpc.profile.toggleVisibility.mutate({ id: profileId });
      setIsPublic(result.is_public);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-2">
        Visibility
      </div>
      <div className="flex items-center gap-2">
        <span className={isPublic ? "text-green-400" : "text-amber-400"}>●</span>
        <span className="text-sm text-neutral-400 font-mono">
          {isPublic ? "Public" : "Private"}
        </span>
        {isOwner && (
          <button
            onClick={handleToggle}
            disabled={loading}
            className="text-[10px] text-neutral-600 hover:text-neutral-300 font-mono ml-1 transition disabled:opacity-50"
          >
            [{loading ? "..." : "toggle"}]
          </button>
        )}
      </div>
    </div>
  );
}
