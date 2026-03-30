import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

export function GearfileRenderer({ content }: { content: string }) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const frontmatter = match?.[1] ?? "";
  const body = match?.[2] ?? content;

  return (
    <div className="space-y-6">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="px-4 py-2 bg-neutral-800/50 text-xs text-neutral-500 font-mono">
          Gearfile.md — YAML Frontmatter
        </div>
        <pre className="p-4 text-sm font-mono text-neutral-300 overflow-x-auto">
          <code>{frontmatter}</code>
        </pre>
      </div>

      {body.trim() && (
        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-neutral-100 prose-p:text-neutral-400 prose-code:text-amber-400">
          <ReactMarkdown rehypePlugins={[rehypeRaw]}>{body}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
