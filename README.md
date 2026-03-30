# gear

The package manager for AI agent configs. Share, discover, and hot-swap agent configurations in seconds.

Like `nvm`, but for agentic environments.

[gear.sh](https://gear.sh) | [npm](https://www.npmjs.com/package/gearsh)

## What is Gear?

Gear lets you publish, share, and instantly switch between AI agent configurations — MCP servers, plugins, skills, model preferences, and custom instructions — all from a single CLI command.

```bash
# Install someone's setup
npx gearsh switch @thomasindrias/full-stack

# Publish your own
npx gearsh push
```

## Quick Start

### 1. Install

```bash
npm i -g gearsh
```

### 2. Authenticate

Sign in at [gear.sh](https://gear.sh), generate a personal access token in Settings, then:

```bash
gear login <your-token>
```

### 3. Browse & Switch

Find a gear on [gear.sh](https://gear.sh) and install it:

```bash
gear switch @username/setup-name
```

Your current config is automatically stashed before switching. Restore anytime:

```bash
gear restore
```

### 4. Publish Your Own

From a directory with your agent config:

```bash
gear push
```

The CLI scans your local setup (MCP servers, plugins, skills, model settings) and publishes it to the registry.

## CLI Commands

| Command | Description |
|---------|-------------|
| `gear login <token>` | Authenticate with the registry |
| `gear push` | Scan and publish your current agent setup |
| `gear switch @user/slug` | Install and activate a gear |
| `gear stash` | Snapshot current config before switching |
| `gear restore` | Restore the most recent stash |
| `gear list` | Show installed gear profiles |
| `gear delete <slug>` | Delete a published gear |

## Supported Platforms

- **Claude Code** — full support (MCP servers, plugins, skills, model, instructions)
- **Gemini CLI** — full support

More platforms coming soon.

## Gearfile Format

Gears are defined as YAML frontmatter + markdown:

```yaml
---
name: My Setup
slug: my-setup
version: 1.0.0
compatibility:
  - claude-code
mcp_servers:
  - name: context7
    runtime: node
    package: "@anthropic-ai/context7-mcp@latest"
plugins:
  - name: superpowers
    marketplace: claude-plugins-official
tags:
  - productivity
  - full-stack
---

## About This Gear

Description of what this setup is optimized for.
```

## Development

```bash
git clone https://github.com/thomasindrias/gear.git
cd gear
pnpm install
pnpm dev
```

See [CLAUDE.md](CLAUDE.md) for detailed development instructions.

## Tech Stack

- **Web:** Next.js 15, React 19, Tailwind CSS 4, tRPC 11
- **CLI:** Commander.js, TypeScript
- **Database:** Supabase (PostgreSQL)
- **Monorepo:** pnpm workspaces + Turborepo

## License

[MIT](LICENSE)
