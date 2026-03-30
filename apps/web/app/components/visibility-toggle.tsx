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
      <div className="flex items-center gap-3">
        <span className={`text-[8px] ${isPublic ? "text-emerald-400" : "text-amber-400"}`}>
          ●
        </span>
        <span className="text-sm text-neutral-400 font-mono">
          {isPublic ? "Public" : "Private"}
        </span>
        {isOwner && (
          <button
            onClick={handleToggle}
            disabled={loading}
            className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 disabled:opacity-50 ml-auto ${
              isPublic ? "bg-emerald-500/30" : "bg-neutral-700"
            }`}
          >
            <span
              className={`absolute top-[3px] w-3 h-3 rounded-full transition-all duration-200 ${
                isPublic
                  ? "left-[14px] bg-emerald-400"
                  : "left-[3px] bg-neutral-400"
              }`}
            />
          </button>
        )}
      </div>
    </div>
  );
}
