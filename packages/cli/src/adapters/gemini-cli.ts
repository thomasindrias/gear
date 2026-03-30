import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Gearfile } from "gear-shared";
import type { PlatformAdapter, ConfigPaths } from "./types.js";
import prompts from "prompts";

export class GeminiCliAdapter implements PlatformAdapter {
  name = "gemini-cli" as const;

  private baseDir = join(homedir(), ".gemini");

  detect(): boolean {
    return existsSync(this.baseDir);
  }

  getConfigPaths(): ConfigPaths {
    return {
      settingsFile: join(this.baseDir, "settings.json"),
      instructionsFile: join(this.baseDir, "GEMINI.md"),
      skillsDir: join(this.baseDir, "skills"),
      hooksDir: join(this.baseDir, "hooks"),
      scriptsDir: join(this.baseDir, "scripts"),
    };
  }

  async stash(stashDir: string): Promise<void> {
    mkdirSync(stashDir, { recursive: true });
    const paths = this.getConfigPaths();

    if (existsSync(paths.settingsFile)) {
      copyFileSync(paths.settingsFile, join(stashDir, "settings.json.bak"));
    }
    if (existsSync(paths.instructionsFile)) {
      copyFileSync(paths.instructionsFile, join(stashDir, "GEMINI.md.bak"));
    }
  }

  async restore(stashDir: string): Promise<void> {
    const paths = this.getConfigPaths();
    const settingsBackup = join(stashDir, "settings.json.bak");
    const instructionsBackup = join(stashDir, "GEMINI.md.bak");

    if (existsSync(settingsBackup)) {
      copyFileSync(settingsBackup, paths.settingsFile);
    }
    if (existsSync(instructionsBackup)) {
      copyFileSync(instructionsBackup, paths.instructionsFile);
    }
  }

  async apply(gearfile: Gearfile, envVars: Record<string, string>): Promise<void> {
    const paths = this.getConfigPaths();

    // 1. Write instructions
    if (gearfile.instructions) {
      mkdirSync(this.baseDir, { recursive: true });
      writeFileSync(paths.instructionsFile, gearfile.instructions);
    }

    // 2. Read existing settings or start fresh
    let settings: Record<string, unknown> = {};
    if (existsSync(paths.settingsFile)) {
      settings = JSON.parse(readFileSync(paths.settingsFile, "utf-8"));
    }

    // 3. Merge MCP servers
    if (gearfile.mcp_servers?.length) {
      const mcpServers: Record<string, unknown> = {};
      for (const server of gearfile.mcp_servers) {
        const command = server.runtime === "python" ? "uvx" : "npx";
        const args =
          server.runtime === "node"
            ? ["-y", server.package, ...(server.args ?? [])]
            : [server.package, ...(server.args ?? [])];

        const resolvedArgs = args.map((arg) =>
          arg.replace(/<([A-Z_]+)>/g, (_, key) => envVars[key] ?? arg),
        );

        const serverConfig: Record<string, unknown> = { command, args: resolvedArgs };
        if (server.env) {
          const resolvedEnv: Record<string, string> = {};
          for (const [k, v] of Object.entries(server.env)) {
            resolvedEnv[k] = v.replace(/<([A-Z_]+)>/g, (_, key) => envVars[key] ?? v);
          }
          serverConfig.env = resolvedEnv;
        }
        mcpServers[server.name] = serverConfig;
      }
      settings.mcpServers = { ...(settings.mcpServers as object ?? {}), ...mcpServers };
    }

    // 4. Skip plugins (not supported on Gemini CLI)
    if (gearfile.plugins?.length) {
      console.warn("Warning: Plugins are not supported on Gemini CLI. Skipping.");
    }

    // 5. Skip skills (not supported on Gemini CLI)
    if (gearfile.skills?.length) {
      console.warn("Warning: Skills are not supported on Gemini CLI. Skipping.");
    }

    // 6. Apply overrides
    if (gearfile.overrides?.["gemini-cli"]) {
      Object.assign(settings, gearfile.overrides["gemini-cli"]);
    }

    mkdirSync(this.baseDir, { recursive: true });
    writeFileSync(paths.settingsFile, JSON.stringify(settings, null, 2));

    // 7. Download custom assets (requires explicit user approval)
    if (gearfile.custom_assets?.length) {
      const applicable = gearfile.custom_assets.filter((a) => a.type !== "hook");
      const skippedHooks = gearfile.custom_assets.filter((a) => a.type === "hook");
      for (const h of skippedHooks) {
        console.warn(`Warning: Hooks not supported on Gemini CLI. Skipping '${h.name}'.`);
      }

      if (applicable.length > 0) {
        console.log("\nThis gear includes custom assets that will be downloaded:");
        for (const asset of applicable) {
          console.log(`  [${asset.type}] ${asset.name} — ${asset.source}`);
        }

        const { proceed } = await prompts({
          type: "confirm",
          name: "proceed",
          message: "Download and install these assets?",
          initial: false,
        });
        if (!proceed) {
          console.log("Skipped custom asset installation.");
        } else {
          for (const asset of applicable) {
            const safeName = asset.name.replace(/[/\\]/g, "_");
            const targetDir = asset.type === "skill" ? paths.skillsDir : paths.scriptsDir;
            mkdirSync(targetDir, { recursive: true });
            const resp = await fetch(asset.source);
            if (!resp.ok) {
              console.warn(`Warning: Failed to download asset '${safeName}'`);
              continue;
            }
            writeFileSync(join(targetDir, safeName), await resp.text());
          }
        }
      }
    }
  }
}
