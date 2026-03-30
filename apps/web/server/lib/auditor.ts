// apps/web/server/lib/auditor.ts

export interface AuditResults {
  secrets_scan: "pass" | "fail";
  verified_sources: "pass" | "warn";
  path_scrubbing: "pass" | "fail";
  unknown_plugins: {
    status: "pass" | "warn";
    details: string[];
  };
}

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/,
  /xoxp-[a-zA-Z0-9-]+/,
  /xoxb-[a-zA-Z0-9-]+/,
  /ghp_[a-zA-Z0-9]{36,}/,
  /ghs_[a-zA-Z0-9]{36,}/,
  /ghr_[a-zA-Z0-9]{36,}/,
  /glpat-[a-zA-Z0-9_-]{20,}/,
  /AKIA[A-Z0-9]{16}/,
  /sbp_[a-zA-Z0-9]{20,}/,
];

const PATH_PATTERNS = [
  /\/Users\/[^/\s"']+/,
  /\/home\/[^/\s"']+/,
  /C:\\Users\\[^\\\s"']+/,
];

const VERIFIED_MARKETPLACES = new Set([
  "claude-plugins-official",
  "superpowers-marketplace",
]);

interface PluginInput {
  name: string;
  marketplace: string;
}

export function runAudits(content: string, plugins: PluginInput[]): AuditResults {
  const secrets_scan = SECRET_PATTERNS.some((p) => p.test(content)) ? "fail" : "pass";
  const path_scrubbing = PATH_PATTERNS.some((p) => p.test(content)) ? "fail" : "pass";

  const unverified = plugins.filter((p) => !VERIFIED_MARKETPLACES.has(p.marketplace));
  const verified_sources = unverified.length > 0 ? "warn" : "pass";

  const unknown_plugins = {
    status: unverified.length > 0 ? ("warn" as const) : ("pass" as const),
    details: unverified.map((p) => `${p.name} from ${p.marketplace}`),
  };

  return { secrets_scan, verified_sources, path_scrubbing, unknown_plugins };
}
