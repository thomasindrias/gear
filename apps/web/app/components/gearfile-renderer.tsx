import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

export function GearfileRenderer({ content }: { content: string }) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const frontmatter = match?.[1] ?? "";
  const body = match?.[2] ?? content;

  return (
    <div className="space-y-6">
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-neutral-800/50 text-[11px] tracking-[0.1em] text-neutral-600 font-mono uppercase">
          Gearfile.md — YAML Frontmatter
        </div>
        <pre className="p-4 text-sm font-mono text-neutral-400 overflow-x-auto">
          <code>{frontmatter}</code>
        </pre>
      </div>

      {body.trim() && (
        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-neutral-200 prose-headings:tracking-tight prose-p:text-neutral-400 prose-code:text-neutral-300 prose-code:font-mono prose-pre:bg-neutral-900/50 prose-pre:border prose-pre:border-neutral-800">
          <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{body}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
