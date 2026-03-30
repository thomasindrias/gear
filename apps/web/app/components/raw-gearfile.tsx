"use client";

export function RawGearfile({ content }: { content: string }) {
  return (
    <details className="group">
      <summary className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono cursor-pointer border-b border-neutral-800/50 pb-2 hover:text-neutral-400 transition select-none list-none [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">▶</span>
        <span className="hidden group-open:inline">▼</span>
        {" "}Raw Gearfile
      </summary>
      <pre className="mt-3 bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 text-xs font-mono text-neutral-500 overflow-x-auto">
        <code>{content}</code>
      </pre>
    </details>
  );
}
