import { z } from "zod";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export const platformSchema = z.enum(["claude-code", "gemini-cli"]);

export const mcpServerSchema = z.object({
  name: z.string(),
  runtime: z.enum(["node", "python", "go"]),
  package: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
});

export const pluginSchema = z.object({
  name: z.string(),
  marketplace: z.string(),
});

export const skillSchema = z.object({
  name: z.string(),
  source: z.string(),
});

export const customAssetSchema = z.object({
  name: z.string(),
  type: z.enum(["hook", "skill", "script"]),
  source: z.string().url(),
});

export const gearfileSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Must be valid semver"),
  compatibility: z.array(platformSchema).min(1),
  tags: z.array(z.string()),
  instructions: z.string().optional(),
  env_required: z.array(z.string()).optional(),
  mcp_servers: z.array(mcpServerSchema).optional(),
  plugins: z.array(pluginSchema).optional(),
  skills: z.array(skillSchema).optional(),
  custom_assets: z.array(customAssetSchema).optional(),
  overrides: z.record(z.record(z.unknown())).optional(),
});

export type Gearfile = z.infer<typeof gearfileSchema>;
export type Platform = z.infer<typeof platformSchema>;
export type McpServer = z.infer<typeof mcpServerSchema>;

export interface ParsedGearfile {
  frontmatter: Gearfile;
  body: string;
}

export function parseGearfile(raw: string): ParsedGearfile {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("Invalid Gearfile: missing YAML frontmatter delimiters (---)");
  }
  const [, yamlStr, body] = match;
  const parsed = parseYaml(yamlStr!);
  const frontmatter = gearfileSchema.parse(parsed);
  return { frontmatter, body: body!.trim() };
}

export function serializeGearfile(frontmatter: Gearfile, body: string): string {
  const yaml = stringifyYaml(frontmatter, { lineWidth: 0 });
  return `---\n${yaml}---\n\n${body}\n`;
}
