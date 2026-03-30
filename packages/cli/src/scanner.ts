import { existsSync, readFileSync, readdirSync, lstatSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Gearfile } from "gear-shared";
import { scrubPaths, redactSecrets } from "./sanitizer.js";

interface ScanResult {
  gearfile: Partial<Gearfile>;
  warnings: string[];
}

export function scanClaudeCode(): ScanResult {
  const baseDir = join(homedir(), ".claude");
  const warnings: string[] = [];
  const gearfile: Partial<Gearfile> = {
    compatibility: ["claude-code"],
    tags: [],
    mcp_servers: [],
    plugins: [],
    skills: [],
    env_required: [],
  };

  const settingsPath = join(baseDir, "settings.json");
  if (existsSync(settingsPath)) {
    const raw = readFileSync(settingsPath, "utf-8");
    const settings = JSON.parse(raw);

    if (settings.mcpServers) {
      for (const [name, config] of Object.entries(settings.mcpServers as Record<string, any>)) {
        const command = config.command as string;
        const runtime = command === "uvx" ? "python" : command === "npx" ? "node" : "node";
        const args: string[] = config.args ?? [];
        let pkg = name;
        const filteredArgs: string[] = [];
        if (runtime === "node") {
          const withoutFlags = args.filter((a: string) => a !== "-y");
          pkg = withoutFlags[0] ?? name;
          filteredArgs.push(...withoutFlags.slice(1));
        } else {
          pkg = args[0] ?? name;
          filteredArgs.push(...args.slice(1));
        }

        gearfile.mcp_servers!.push({
          name,
          runtime: runtime as "node" | "python" | "go",
          package: scrubPaths(redactSecrets(pkg)),
          ...(filteredArgs.length && { args: filteredArgs.map((a) => scrubPaths(redactSecrets(a))) }),
          ...(config.env && {
            env: Object.fromEntries(
              Object.entries(config.env as Record<string, string>).map(([k, v]) => [
                k,
                `<${k}>`,
              ]),
            ),
          }),
        });

        if (config.env) {
          for (const key of Object.keys(config.env as object)) {
            if (!gearfile.env_required!.includes(key)) {
              gearfile.env_required!.push(key);
            }
          }
        }
      }
    }

    if (settings.enabledPlugins) {
      for (const [key, enabled] of Object.entries(settings.enabledPlugins as Record<string, boolean>)) {
        if (enabled) {
          const [name, marketplace] = key.split("@");
          if (name && marketplace) {
            gearfile.plugins!.push({ name, marketplace });
          }
        }
      }
    }

    if (settings.model) {
      gearfile.overrides = { "claude-code": { model: settings.model } };
    }
  }

  const claudeMdPath = join(baseDir, "CLAUDE.md");
  if (existsSync(claudeMdPath)) {
    gearfile.instructions = scrubPaths(redactSecrets(readFileSync(claudeMdPath, "utf-8")));
  }

  const skillsDir = join(baseDir, "skills");
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir)) {
      const fullPath = join(skillsDir, entry);
      const isSymlink = lstatSync(fullPath).isSymbolicLink();
      gearfile.skills!.push({
        name: entry,
        source: isSymlink ? "marketplace" : "local",
      });
      if (!isSymlink) {
        warnings.push(`Skill '${entry}' is a local directory. Provide a URL during publish to share it.`);
      }
    }
  }

  return { gearfile, warnings };
}

export function scanGeminiCli(): ScanResult {
  const baseDir = join(homedir(), ".gemini");
  const warnings: string[] = [];
  const gearfile: Partial<Gearfile> = {
    compatibility: ["gemini-cli"],
    tags: [],
    mcp_servers: [],
    env_required: [],
  };

  const settingsPath = join(baseDir, "settings.json");
  if (existsSync(settingsPath)) {
    const raw = readFileSync(settingsPath, "utf-8");
    const settings = JSON.parse(raw);

    if (settings.mcpServers) {
      for (const [name, config] of Object.entries(settings.mcpServers as Record<string, any>)) {
        const command = config.command as string;
        const runtime = command === "uvx" ? "python" : "node";
        const args: string[] = config.args ?? [];
        let pkg = name;
        const filteredArgs: string[] = [];
        if (runtime === "node") {
          const withoutFlags = args.filter((a: string) => a !== "-y");
          pkg = withoutFlags[0] ?? name;
          filteredArgs.push(...withoutFlags.slice(1));
        } else {
          pkg = args[0] ?? name;
          filteredArgs.push(...args.slice(1));
        }

        gearfile.mcp_servers!.push({
          name,
          runtime: runtime as "node" | "python" | "go",
          package: scrubPaths(redactSecrets(pkg)),
          ...(filteredArgs.length && { args: filteredArgs.map((a) => scrubPaths(redactSecrets(a))) }),
        });
      }
    }
  }

  const geminiMdPath = join(baseDir, "GEMINI.md");
  if (existsSync(geminiMdPath)) {
    gearfile.instructions = scrubPaths(redactSecrets(readFileSync(geminiMdPath, "utf-8")));
  }

  return { gearfile, warnings };
}
