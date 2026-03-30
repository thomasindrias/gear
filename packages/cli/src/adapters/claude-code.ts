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

export class ClaudeCodeAdapter implements PlatformAdapter {
  name = "claude-code" as const;

  private baseDir = join(homedir(), ".claude");

  detect(): boolean {
    return existsSync(this.baseDir);
  }

  getConfigPaths(): ConfigPaths {
    return {
      settingsFile: join(this.baseDir, "settings.json"),
      instructionsFile: join(this.baseDir, "CLAUDE.md"),
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
      copyFileSync(paths.instructionsFile, join(stashDir, "CLAUDE.md.bak"));
    }
  }

  async restore(stashDir: string): Promise<void> {
    const paths = this.getConfigPaths();
    const settingsBackup = join(stashDir, "settings.json.bak");
    const instructionsBackup = join(stashDir, "CLAUDE.md.bak");

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

        // Replace <ENV_VAR> placeholders
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

    // 4. Enable plugins
    if (gearfile.plugins?.length) {
      const enabled = (settings.enabledPlugins as Record<string, boolean>) ?? {};
      for (const plugin of gearfile.plugins) {
        enabled[`${plugin.name}@${plugin.marketplace}`] = true;
      }
      settings.enabledPlugins = enabled;
    }

    // 5. Apply overrides
    if (gearfile.overrides?.["claude-code"]) {
      Object.assign(settings, gearfile.overrides["claude-code"]);
    }

    writeFileSync(paths.settingsFile, JSON.stringify(settings, null, 2));

    // 6. Download custom assets (requires explicit user approval)
    if (gearfile.custom_assets?.length) {
      console.log("\nThis gear includes custom assets that will be downloaded:");
      for (const asset of gearfile.custom_assets) {
        console.log(`  [${asset.type}] ${asset.name} — ${asset.source}`);
      }

      const hasHooks = gearfile.custom_assets.some((a) => a.type === "hook");
      if (hasHooks) {
        console.warn("\n  ⚠ WARNING: This gear includes hooks that will execute automatically.");
        console.warn("  Only install hooks from authors you trust.");
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
        for (const asset of gearfile.custom_assets) {
          // Prevent path traversal
          const safeName = asset.name.replace(/[/\\]/g, "_");
          let targetDir: string;
          switch (asset.type) {
            case "hook":
              targetDir = paths.hooksDir;
              break;
            case "skill":
              targetDir = paths.skillsDir;
              break;
            case "script":
              targetDir = paths.scriptsDir;
              break;
          }
          mkdirSync(targetDir, { recursive: true });
          const resp = await fetch(asset.source);
          if (!resp.ok) {
            console.warn(`Warning: Failed to download asset '${safeName}' from ${asset.source}`);
            continue;
          }
          const content = await resp.text();
          writeFileSync(join(targetDir, safeName), content);
        }
      }
    }
  }
}
