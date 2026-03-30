"use client";

import { useState } from "react";
import { CompatibilityBadge } from "./compatibility-badge";

interface ProfileCardProps {
  username: string;
  slug: string;
  name: string;
  description: string;
  tags: string[];
  compatibility: string[];
  downloads_count: number;
  avatar_url: string | null;
}

export function ProfileCard(props: ProfileCardProps) {
  const [copied, setCopied] = useState(false);
  const installCmd = `gear switch @${props.username}/${props.slug}`;

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <a
      href={`/${props.username}/${props.slug}`}
      className="group block bg-neutral-900 border border-neutral-800 rounded-lg p-5 hover:border-amber-500/50 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {props.avatar_url && (
            <img
              src={props.avatar_url}
              alt={props.username}
              className="w-6 h-6 rounded-full"
            />
          )}
          <span className="text-xs text-neutral-500 font-mono">
            @{props.username}
          </span>
        </div>
        <span className="text-xs text-neutral-600">
          {props.downloads_count.toLocaleString()} downloads
        </span>
      </div>

      <h3 className="text-base font-semibold text-neutral-100 mb-1">
        {props.name}
      </h3>
      <p className="text-sm text-neutral-400 mb-3 line-clamp-2">
        {props.description}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {props.compatibility.map((p) => (
          <CompatibilityBadge key={p} platform={p} />
        ))}
        {props.tags.slice(0, 3).map((t) => (
          <span
            key={t}
            className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400"
          >
            {t}
          </span>
        ))}
      </div>

      <button
        onClick={handleCopy}
        className="w-full text-left font-mono text-xs bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-neutral-500 group-hover:border-amber-500/30 group-hover:text-amber-400 transition-all opacity-0 group-hover:opacity-100"
      >
        {copied ? "Copied!" : `$ ${installCmd}`}
      </button>
    </a>
  );
}
