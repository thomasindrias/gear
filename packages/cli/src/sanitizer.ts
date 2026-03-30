export interface SecretMatch {
  pattern: string;
  match: string;
  index: number;
}

const SECRET_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: "OpenAI/Anthropic API key", regex: /sk-[a-zA-Z0-9]{20,}/g },
  { name: "Slack token (xoxp)", regex: /xoxp-[a-zA-Z0-9-]+/g },
  { name: "Slack token (xoxb)", regex: /xoxb-[a-zA-Z0-9-]+/g },
  { name: "GitHub token (ghp)", regex: /ghp_[a-zA-Z0-9]{36,}/g },
  { name: "GitHub token (ghs)", regex: /ghs_[a-zA-Z0-9]{36,}/g },
  { name: "GitHub token (ghr)", regex: /ghr_[a-zA-Z0-9]{36,}/g },
  { name: "GitLab token", regex: /glpat-[a-zA-Z0-9_-]{20,}/g },
  { name: "AWS access key", regex: /AKIA[A-Z0-9]{16}/g },
  { name: "Supabase token", regex: /sbp_[a-zA-Z0-9]{20,}/g },
];

export function scrubPaths(content: string): string {
  let result = content.replace(/\/Users\/[^/\s"']+/g, "<USER_HOME>");
  result = result.replace(/\/home\/[^/\s"']+/g, "<USER_HOME>");
  result = result.replace(/C:\\Users\\[^\\\s"']+/g, "<USER_HOME>");
  return result;
}

export function detectSecrets(content: string): SecretMatch[] {
  const matches: SecretMatch[] = [];

  for (const { name, regex } of SECRET_PATTERNS) {
    const re = new RegExp(regex.source, regex.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      matches.push({
        pattern: name,
        match: match[0],
        index: match.index,
      });
    }
  }

  return matches;
}

export function redactSecrets(content: string): string {
  let result = content;
  for (const { regex } of SECRET_PATTERNS) {
    const re = new RegExp(regex.source, regex.flags);
    result = result.replace(re, "<REDACTED>");
  }
  return result;
}
