import { AGENT_ICONS, AGENT_LABELS } from "./icons";

export function CompatibilityBadge({ platform }: { platform: string }) {
  const Icon = AGENT_ICONS[platform];
  const label = AGENT_LABELS[platform] ?? platform;

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-neutral-900/50 border border-neutral-800/50 text-neutral-400">
      {Icon && <Icon size={12} />}
      {label}
    </span>
  );
}
