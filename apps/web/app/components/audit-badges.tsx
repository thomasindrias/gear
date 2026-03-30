// apps/web/app/components/audit-badges.tsx

interface AuditResults {
  secrets_scan: "pass" | "fail";
  verified_sources: "pass" | "warn";
  path_scrubbing: "pass" | "fail";
  unknown_plugins: {
    status: "pass" | "warn";
    details: string[];
  };
}

const STATUS_STYLES = {
  pass: "text-green-400 bg-green-400/10 border-green-400/20",
  warn: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  fail: "text-red-400 bg-red-400/10 border-red-400/20",
};

function Badge({ status }: { status: "pass" | "warn" | "fail" }) {
  return (
    <span
      className={`text-[10px] font-semibold font-mono px-2.5 py-0.5 rounded border ${STATUS_STYLES[status]}`}
    >
      {status.toUpperCase()}
    </span>
  );
}

export function AuditBadges({ results }: { results: AuditResults | null }) {
  if (!results) return null;

  const checks = [
    { label: "Secrets scan", status: results.secrets_scan },
    { label: "Verified sources", status: results.verified_sources },
    { label: "Path scrubbing", status: results.path_scrubbing },
    { label: "Unknown plugins", status: results.unknown_plugins.status },
  ];

  const warnings = results.unknown_plugins.details;

  return (
    <div>
      <div className="text-[11px] tracking-[0.2em] text-neutral-600 uppercase font-mono mb-3">
        Security Audits
      </div>
      <div className="flex flex-col gap-2">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-center justify-between"
          >
            <span className="text-xs text-neutral-400 font-mono">
              {check.label}
            </span>
            <Badge status={check.status} />
          </div>
        ))}
      </div>
      {warnings.length > 0 && (
        <p className="text-[10px] text-neutral-600 mt-2 leading-relaxed font-mono">
          {warnings.length} plugin{warnings.length > 1 ? "s" : ""} from
          unverified source{warnings.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
