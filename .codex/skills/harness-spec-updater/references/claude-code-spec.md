# Anthropic Claude Code Specification (v2.1+)

*Distilled from Anthropic Claude Code official SchemaStore specification (`https://json.schemastore.org/claude-code-settings.json`), CLI documentation, and XHS declarative mappings.*

---

## 1. Configuration Hierarchy

Claude Code CLI manages configuration across user and project scopes:
- **Global Settings**: `~/.claude/settings.json`
- **Project Settings**: `.claude/settings.json`
- **Session & Auth State**: `~/.claude.json`
- **Project Guidelines**: `CLAUDE.md`
- **MCP Configuration**: `.mcp.json` (project root) or `~/.claude/mcp.json`

---

## 2. JSON Schema Specification

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "model": "Qwen3.8-27B-Brainwaves-2M-qx64-hi-mlx",
  "outputStyle": "Explanatory",
  "verbose": true,
  "disableAllHooks": false,
  "cleanupPeriodDays": 30,
  "dangerouslySkipPermissions": false,
  "autoUpdatesChannel": "latest",
  "autoMemoryEnabled": true,
  "enableAllProjectMcpServers": false,
  "permissions": {
    "allow": [
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(uv *)",
      "Bash(pytest *)",
      "mcp__agentmemory__*"
    ],
    "deny": [
      "Bash(rm -rf /)",
      "Bash(rm -rf ~)"
    ],
    "ask": [
      "Bash(git push *)",
      "WebFetch(domain:antigravity.google)"
    ],
    "defaultMode": "default",
    "additionalDirectories": [
      "~/.cache",
      "~/.uv"
    ]
  },
  "sandbox": {
    "enabled": true,
    "allowUnsandboxedCommands": false,
    "filesystem": {
      "denyRead": ["./.env", "*.env"],
      "denyWrite": ["~/.bashrc", "~/.zshrc"],
      "allowWrite": ["~/.cache", "~/.uv"]
    },
    "network": {
      "allowedDomains": ["antigravity.google", "github.com", "python.org"]
    }
  }
}
```

---

## 3. Permissions & Security Architecture

### 3.1 Permission Triad (`allow` / `deny` / `ask`)
- **`allow`**: Auto-approved operations. Format: `Bash(pattern)`, `mcp__<server>__<tool>`, `WebFetch(domain:<domain>)`.
- **`deny`**: Blocked outright. High-risk OS destruction commands or sensitive read/write targets.
- **`ask`**: Explicit interactive confirmation required before execution.

### 3.2 WebFetch Access Control
URL reading uses the structured pattern:
`WebFetch(domain:<fully-qualified-domain>)`

### 3.3 Sandbox Policies
- `sandbox.enabled`: Enables OS-level process isolation.
- `sandbox.allowUnsandboxedCommands`: Determines if commands outside sandbox are permitted.
- `sandbox.filesystem`:
  - `denyRead`: Sensitive files inaccessible to the agent.
  - `denyWrite`: System files protected from writes.
  - `allowWrite`: Writable paths beyond active workspace (linked to `writable_roots`).
- `sandbox.network`: Domain allowlisting/denylisting for agent outbound network traffic.

---

## 4. MCP Configuration Architecture

Claude Code reads MCP servers from `.mcp.json` located at the project root.
XHS configures destination overrides in `catalog/agents/specs/claude-code.yaml`:
```yaml
destination_overrides:
  mcp_servers: "{target}/.mcp.json"
```

---

## 5. Declarative Merge Policy & Preserved Keys

In-session user settings (plugin activations, UI themes, notification preferences) must be preserved across `xhs deploy`. The following paths are protected in `catalog/agents/specs/claude-code.yaml`:

- `enabledPlugins`
- `hooks`
- `mcpServers`
- `preferredNotifChannel`
- `theme`
- `effortLevel`
- `alwaysThinkingEnabled`
- `autoUpdatesChannel`
- `autoMemoryEnabled`
