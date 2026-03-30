export function CompatibilityBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    "claude-code": "bg-amber-500/20 text-amber-400 border-amber-500/30",
    "gemini-cli": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono border ${colors[platform] ?? "bg-neutral-700 text-neutral-300 border-neutral-600"}`}
    >
      {platform}
    </span>
  );
}
