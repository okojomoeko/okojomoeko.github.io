# Antigravity CLI / IDE Specification (v1.5.0)

*Distilled from Antigravity CLI / IDE releases (v1.2.0 - v1.3.0), primary docs (`https://antigravity.google/docs/cli/reference`, `cli-permissions`, `cli-sandbox`), and `.agents` outputs.*

## 1. Antigravity Plugins Architecture
Antigravity supports namespacing agents and skills using Plugins. XHS strictly utilizes this mechanism to perfectly isolate global (`base`) and local (`xhs`) profiles.

**Path Structure**: `.agents/plugins/<plugin_name>/` or `~/.gemini/config/plugins/<plugin_name>/`
**Required Manifest**: `plugin.json` (placed in the plugin root)
```json
{
  "name": "<string> - The plugin/profile name",
  "version": "<string> - e.g. 1.0.0",
  "description": "<string>"
}
```

## 2. Agent Definition Specification

Native Antigravity subagents are defined in `.agents/plugins/<plugin_name>/agents/<agent_name>/`.
Antigravity supports both native Markdown frontmatter (`agent.md`, introduced in v1.1.6+) and JSON (`agent.json`).

### 2.1 Markdown Definition (`agent.md`) — Preferred for v1.1.6+
```markdown
---
name: custom-agent
description: Specialized agent description
model: Gemini 3.8 Flash (High)
tools:
  - run_command
  - view_file
subagent: true
hidden: false
inheritCustomizations: true
inheritMcp: true
excludeDefaultComponents: false # Supported in v1.2.1+ to opt out of default prompt sections and built-in tools
---

# Agent System Instructions
Markdown system instructions here.
```

### 2.2 JSON Definition (`agent.json`) — Backward Compatibility
```json
{
  "name": "<string> - Unique name of the agent",
  "description": "<string> - Short description",
  "hidden": "<boolean> - Usually false to make it visible in CLI",
  "config": {
    "customAgent": {
      "systemPromptSections": [
        {
          "title": "Agent System Instructions",
          "content": "<string> - The markdown body of the agent instructions"
        }
      ],
      "toolNames": ["<string> - List of explicit tools, e.g., 'run_command'"],
      "systemPromptConfig": {
        "includeSections": [
          "user_information",
          "mcp_servers",
          "skills",
          "subagent_reminder",
          "messaging",
          "artifacts",
          "user_rules"
        ]
      }
    }
  }
}
```

## 3. Skill Frontmatter Specification (`SKILL.md`)

Located at `.agents/plugins/<plugin_name>/skills/<skill_name>/SKILL.md`.

```yaml
---
name: skill-name
description: A concise description of the skill and trigger context
disable-slash-command: false # Set true to hide from '/' menu while leaving invocable by model (v1.1.12+)
metadata:
  icon: "🔧" # Skill emoji icon displayed in /skills and autocompletion popups (v1.1.20+)
compatibility:
  - antigravity
---
```

## 4. Fine-Grained Permissions Engine (v1.2.8 Unified Permission System)

Antigravity evaluates 3 distinct access lists: `deny` > `ask` > `allow`.
Every resource is formatted as `action(target)`.

### Supported Actions:
| Action | Target Format | Description |
|---|---|---|
| `read_file` | `read_file(/path)`, `read_file(dir)`, `read_file(*)` | Recursive read for directories. **Globs (`**`, `*` in paths) are NOT supported.** |
| `write_file` | `write_file(/path)`, `write_file(dir)`, `write_file(*)` | Implicitly grants `read_file`. Globs not supported. |
| `read_url` | `read_url(domain)`, `read_url(*)` | Hostname/subdomain match. Ignores path segments. In terminal sandbox, populates network outbound allowlist. |
| `execute_url` | `execute_url(domain)`, `execute_url(*)` | Web element actuation (clicks, typing) and interactive workflows. |
| `command` | `command(prefix)`, `command(regex:...)`, `command(*)` | Token prefix literal matching (word-by-word) or regex match. Wildcard '*' is ONLY valid as global wildcard `command(*)`. Trailing ' *' or globs in prefix are strictly forbidden. **Covers command execution both inside and outside the sandbox.** |
| `unsandboxed` | *(Deprecated in v1.2.2+)* | **Deprecated & Ignored**: in macOS/Linux v1.2.2+, all commands must use `command(...)`. Any `unsandboxed` rule triggers a startup warning and grants nothing. |
| `mcp` | `mcp(server/tool)`, `mcp(server/*)`, `mcp(*)` | MCP server/tool authorization. |

## 5. Global Project Settings (`settings.json`)
Defined at `.agents/settings.json` or `~/.gemini/antigravity-cli/settings.json`.

```json
{
  "enableTelemetry": false,
  "theme": "dark",
  "colorScheme": "terminal",
  "modelProvider": "gemini",
  "UseG1Credits": true,
  "EditorMode": "default",
  "toolExecutionPolicy": "request-review",
  "toolPermission": "request-review",
  "artifactReviewPolicy": "asks-for-review",
  "terminalSandbox": true,
  "enableTerminalSandbox": true,
  "allowNonWorkspaceAccess": true,
  "internetAccessPolicy": "ask",
  "nonWorkspaceFileAccess": "allow",
  "permissionGrants": [
    "mcp(agentmemory/*)",
    "command(git status)"
  ],
  "permissions": {
    "allow": [
      "command(git status)",
      "command(git push)",
      "command(docker)",
      "read_url(github.com)",
      "execute_url(github.com)"
    ],
    "deny": [
      "command(rm -rf /)",
      "command(curl)"
    ],
    "ask": [
      "command(*)"
    ]
  },
  "protectedPaths": [
    "/etc",
    "/System",
    "/usr/bin",
    "/var/root"
  ],
  "theme": "dark",
  "colorScheme": "terminal",
  "verbosity": "medium",
  "ide": {
    "enabled": true
  }
}
```

> [!IMPORTANT]
> **Command Token Prefix Matching Hygiene**:
> - Antigravity evaluates `command(prefix)` via word-by-word token prefix matching.
> - Trailing shell wildcards (` *`, ` .*`) are NOT treated as globs; they are interpreted as literal string arguments, which breaks matching for actual invocations (e.g., `command(ls *)` will fail to match `ls -la`).
> - All command rules must use clean token prefixes (e.g., `command(ls)`, `command(head)`, `command(git diff)`) or explicit anchored regular expressions (`command(regex:...)`).
> - Wildcard `*` is only valid as the global action wildcard `command(*)`.

> [!IMPORTANT]
> **Seatbelt Sandbox Hygiene (v1.2.10+)**:
> - Never place non-absolute paths (tilde paths `~/.ssh` or relative paths `.env`, `./.env`) in `permissions.deny` or `protectedPaths`. In macOS Seatbelt (`sandbox-exec`), any non-absolute path triggers fatal `sandbox configuration error: deny <path>: non-absolute file path` crashes.
> - Sensitive user home directories are automatically shielded by Antigravity's internal hardcoded system protection boundary rules and workspace isolation.
> - Workspace-relative files (like `.env`) are governed by rule instructions and `.gitignore`, not OS Seatbelt filters.
> - Only specify clean absolute system paths (`/etc`, `/System`, `/usr/bin`, `/var/root`).

## 6. MCP Configuration (`mcp_config.json`)
Defined at `.agents/mcp_config.json` or `~/.gemini/antigravity-cli/mcp_config.json`. Follows Model Context Protocol (stdio & HTTP transports supported in v1.1.16+).

```json
{
  "mcpServers": {
    "local-stdio-server": {
      "command": "uvx",
      "args": ["agentmemory-mcp"],
      "env": {
        "AGENT_MEMORY_PATH": "~/.gemini/agentmemory"
      }
    },
    "remote-http-server": {
      "type": "http",
      "url": "https://mcp.example.com/sse",
      "headers": {
        "Authorization": "Bearer ${AUTH_TOKEN}"
      }
    }
  }
}
```

## 7. CLI v1.2.10 Features & Specification Updates
- **Verbosity Modes**: `/config` supports `high`, `medium`, and `low`. `medium` summarizes tool groups (e.g. `Explored N files`) while preserving command visibility.
- **Flat Directory Scanning**: `skills.json`, `rules.json`, `agents.json`, and `plugins.json` now scan items directly inside each directory without recursive loading. Nested items require explicit `include_only`.
- **Direct Subagent Messaging**: `@<subagent> <message>` prompt syntax with autocomplete.
- **Vim Count Multipliers**: Normal/Visual mode multipliers supported (`3dw`, `2di(`, `[count]G`).
- **Subagent Worktree Isolation**: Subagent Git worktrees are cleanly managed under `<appDataDir>/worktrees/`.

## 8. CLI v1.3.0 Milestone Specifications & Invariants
- **Default Verbosity Shift to `medium`**:
  - In v1.3.0, the default `Verbosity` setting is updated from `high` to `medium`.
  - Groups related sequential tool calls and internal thoughts into concise collapsible summaries (e.g., `Explored 12 files`), preventing prompt and terminal scrollback bloat while keeping executed shell commands and model responses fully visible.
  - Users who need raw inspection for all intermediate tool calls can select `high` via `/config` or `"ui": {"verbosity": "high"}` in settings.
- **Deterministic Reasoning Effort Control**:
  - CLI flag `--effort (low|medium|high|xhigh|max)` enables fine-grained control over Gemini 3.8/3.7 thinking budgets per invocation.
- **Queued Messages Immediate Delivery (`Send Immediately`)**:
  - The `sendImmediately: true` option in `general` settings allows messages queued during model streaming or background tool execution to be dispatched and merged immediately in order, without stalling.
- **Terminal UI / Diff Enhancements**:
  - `/diff` viewer binds `j`/`k` to cursor line navigation (up/down arrow equivalent), with left/right arrow keys switching files.
  - Robust handling of workspace file paths containing spaces, `#`, `%`, or unicode characters.
- **Modular Image Generation Delegation**:
  - Image generation is cleanly delegated to the built-in `image-generator` subagent, outputting persisted artifact paths.

## 9. CLI v1.4.0 - v1.4.8 Milestone Specifications & Invariants
- **Seatbelt Path Hygiene (Strict Absolute Paths)**:
  - In Antigravity 1.4.x, macOS Seatbelt strictly forbids non-absolute relative paths (such as `.env`, `./.env`, `foo/bar`) in `permissions.deny`, `permissions.allow`, and `protectedPaths`.
  - Non-absolute paths cause fatal startup errors: `sandbox configuration error: deny <path>: non-absolute file path`.
  - All path rules in XHS adapters must be normalized to absolute paths (`/Users/...`, `/etc`) or wildcard `*`.
- **Hook Input Ingestion (`lastUserInput`)**:
  - In v1.4.7+, hook commands receive `lastUserInput` within the stdin JSON payload, allowing pre-execution screeners and audit hooks to inspect the user's latest prompt before execution.
- **Plugin Manifest Schema Validation**:
  - `plugin.json` validates `author` (as string or `{"name": "...", "url": "..."}`), `homepage`, and `repository` fields.
- **Model Lineup**:
  - Gemini 4 Argon (`gemini-4-argon-high`, `gemini-4-argon-medium`, `gemini-4-argon-low`)
  - Gemini 3.8 Flash (`gemini-3.8-flash-high`, `gemini-3.8-flash-medium`, `gemini-3.8-flash-low`)
  - Claude Opus/Sonnet 5.5 (`claude-opus-5-5-*`, `claude-sonnet-5-5-*`)
  - GPT-OSS 120B (`gpt-oss-120b-medium`)
- **MCP Response In-Memory Threshold**:
  - On-demand MCP tool output up to 10 KB is returned directly in-memory to the agent without disk file redirection.

## 10. CLI v1.4.9 - v1.4.12 Milestone Specifications & Invariants
- **PreInvocation Hook Termination & Screener Support (v1.4.11+)**:
  - `PreInvocation` hooks can return `terminationBehavior: "terminate"` to stop a turn *before* the model is called (e.g. prompt screening, secret leakage prevention).
  - Hooks can inject an `errorMessage` whose `userMessage` is displayed directly to the user without sending it to the model. In headless (`-p`) runs, this exits immediately with a non-zero exit code.
- **Machine-Readable Finished Reason for Loops (v1.4.11+)**:
  - `--output-format json` and `stream-json` include a `finished_reason` field (`print_timeout`, `interrupted`, or `error`) when a turn ends prematurely, allowing autonomous orchestrators and LCGE loops to distinguish cut-off turns from normal completion.
- **Claude Code Plugin Import Interoperability (v1.4.11+)**:
  - `agy plugin import claude` reads installed Claude Code plugins, preserves remote HTTP MCP servers (`"type": "http"`, `url`, `headers`), and expands `${CLAUDE_PLUGIN_ROOT}`.
- **Terminal Reply Streaming & Protocol Efficiency (v1.4.10+)**:
  - Reply streaming scrolls lines directly into terminal scrollback instead of full-screen redraws, writing ~70% fewer bytes to the terminal and greatly improving throughput over remote/SSH sessions.
- **Process Memory Optimization (v1.4.10+)**:
  - The CLI releases ~100 MB of startup heap memory back to the operating system 15 seconds after launching the interactive UI.
- **Subagent Context Compaction Task Preservation (v1.4.10+)**:
  - Subagents no longer lose their initial parent task assignment or parent conversation ID after context compaction (the summary preserves the parent agent's 10 most recent messages).
- **Compaction Metrics Alignment (v1.4.10+)**:
  - Post-compaction markers and `/context` account for active snapshots (earlier requests, artifacts, subagent trees, running tasks), reflecting true context footprint.
- **Image Input Auto-Normalization & Dimensions (v1.4.10+)**:
  - Images are capped at 2,000 pixels per side; large PNGs are dynamically converted to JPEG when smaller to prevent exceeding model payload limits. Misnamed formats (JPEG labeled PNG) are automatically handled without error.
- **Terminal Image Pasting & Drag-and-Drop (v1.4.9+)**:
  - Direct image pasting via terminal shortcuts (`Cmd+V`, `Ctrl+Shift+V`) and dragging image files into the prompt automatically attaches them.
  - SSH image paste over X11/Wayland forwarding supported, with clipboard helper detection (`wl-clipboard` on Wayland).
- **Plugin Discover Categorization & Validation Hardening (v1.4.9+)**:
  - `/plugin` Discover tab groups marketplace plugins into official marketplace sections rather than a flat list.
  - `agy plugin validate` strictly enforces lowercase kebab-case for plugin names (fails under `--strict`), and inspects plugin logo paths and context provider `iconUri` attributes for invalid/external paths.
- **Granular Google Site Execution Permissions (`execute_url`) (v1.4.9+)**:
  - Approving a broad Google domain (e.g. `www.google.com` or `cloud.google.com`) no longer implicitly grants access to sensitive Google services (`mail.google.com`, `docs.google.com`, `drive.google.com`, `accounts.google.com`, `console.cloud.google.com`); each requires dedicated approval.
- **Multi-line Command Rule Matching (v1.4.9+)**:
  - Fixed always-allow rules for multi-line scripts (e.g. `python -c` or `node -e`), ensuring tokens match properly across line breaks.
- **Auto Mode Sandbox Context Awareness (v1.4.9+)**:
  - Auto mode reviewer checks repository context before auditing commands that exit sandbox, eliminating redundant `git status` timeouts in non-git directories.
- **Patch & Bugfix Alignment (v1.4.12)**:
  - Stability and crash reporter fixes across interactive sessions and background services.

## 11. CLI v1.5.0 Milestone Specifications & Invariants
- **Agent Client Protocol (ACP) Server (`agy acp`)**:
  - Runs the CLI as an Agent Client Protocol (ACP) server over stdio (`agy acp`), enabling editors (Zed, VS Code, Neovim) to drive Antigravity as an agent harness with live streaming.
  - Supports image and embedded file context injection, active turn steering (steering in-flight turns with new prompts), and native session execution modes (`default`, `accept-edits`, `plan`).
  - Restores sessions without replaying historical turns while preserving distinct models and thinking levels per session.
  - Terminal-based Google sign-in via `agy acp --login` for headless, browserless, or remote SSH environments.
- **Remote Agent Sessions (`--remote-agent`)**:
  - Executes conversation sessions directly on remote agents instead of the local machine via `--remote-agent`.
  - Supports targeting remote projects via `--project <id|name>` (with fallback to default remote project).
  - Integrates remote `@`-mention completion, "Open in browser" links for non-terminal artifacts, remote workspace header badges, and remote permission presets in `/config`.
- **Local Projects Management (`/projects`)**:
  - Full local session project lifecycle directly within `/projects`: listing, creating (via absolute, `~`, or relative paths), renaming, modifying directory targets, and switching between projects with automatic conversation resets.
- **Partner Plugin & MCP Server Authentication**:
  - In `/plugin`, integrates native sign-in screens for partner plugins requiring authentication (with skip option), `⚠ needs sign-in` warning markers, and status indicators in the *Installed* tab.
- **Sidecar Template Variable Expansion (`${HOME}`)**:
  - Added built-in `${HOME}` variable interpolation for plugin `sidecar.json` templates.
- **CPU, Memory & Rendering Optimizations**:
  - Pauses screen repaints when idle, halving idle CPU consumption.
  - Throttles redundant screen refreshes and quota/balance polling during reply streaming.
  - Caches syntax highlighting tokens, rendered Markdown blocks, and inline file edit confirmation diffs to minimize CPU and heap footprint.
  - Auto mode review tuning: relaxes permission prompts for safe external operations (recoverable git deletes, registry package management, safe uploads), reducing review latency and timeouts.
