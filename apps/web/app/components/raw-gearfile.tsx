"use client";

export function RawGearfile({ content }: { content: string }) {
  return (
    <details className="group">
      <summary className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono cursor-pointer pb-2 border-b border-neutral-800/40 hover:text-neutral-400 transition select-none list-none [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">▶</span>
        <span className="hidden group-open:inline">▼</span>
        {" "}Raw Gearfile
      </summary>
      <pre className="mt-3 bg-neutral-950 border border-neutral-800/50 rounded-xl p-4 text-xs font-mono text-neutral-500 overflow-x-auto leading-relaxed">
        <code>{content}</code>
      </pre>
    </details>
  );
}
