# OpenAI Codex Specification (v0.164.0)

*Distilled from OpenAI Codex official `config-schema.json`, official CLI releases, and XHS declarative mappings.*

---

## 1. Configuration Hierarchy

Codex CLI loads configuration hierarchically:
- **Global Configuration**: `~/.codex/config.toml`
- **Project Configuration**: `.codex/config.toml`
- **Hooks Specification**: `~/.codex/hooks.json` or `.codex/hooks.json`
- **Local Model Catalog**: `~/.codex/model-catalog.local.json`
- **Local Rules**: `.codex/rules/` and `AGENTS.md`

---

## 2. Core Configuration Parameters

```toml
# Provider & Model routing
model_provider = "omlx"
model = "Qwen3.8-27B-Brainwaves-2M-qx64-hi-mlx"
model_auto_compact_token_limit = 130000
model_catalog_json = "~/.codex/model-catalog.local.json"

# UI & Persona
personality = "pragmatic"
service_tier = "flex"
file_opener = "vscode"
web_search = "live"

# Security & Sandboxing Policy
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = true
writable_roots = ["~/.cache", "~/.uv", "~/.npm", "~/.cargo", "~/.local/share", "~/.local/state"]

[approvals]
trusted_commands = ["git status", "git diff *", "uv *", "pytest *", "npm test *"]
persistent_instructions = "Follow project AGENTS.md guidelines."
```

---

## 3. Security, Sandbox & Approvals Architecture

### 3.1 Approval Policy Modes
- `"on-request"`: Ask for user confirmation for untrusted commands or modifications outside workspace.
- `"untrusted"`: Prompt on commands not in `trusted_commands`.
- `"always"`: Always prompt.
- `"never"`: Bypass prompts (equivalent to headless full auto).

### 3.2 Sandbox Modes
- `"workspace-write"`: Agent can freely write inside the active workspace and explicitly granted `writable_roots`.
- `"read-only"`: File mutations are rejected.
- `"danger-full-access"`: Uncontained execution across the OS.

### 3.3 Safe Writable Roots Invariant
If `writable_roots` is empty, Codex operations involving package caching or compiler artifacts may fail. XHS automatically supplements default safe developer cache directories (`~/.cache`, `~/.uv`, `~/.npm`, etc.).

---

## 4. Feature Flags (`[features]`)

Codex employs a fine-grained feature toggle matrix in `config.toml`:

| Feature Flag | Type | Description |
| :--- | :--- | :--- |
| `hooks` | `bool` | **Official key** for lifecycle hook dispatch (`hooks.json`). |
| `codex_hooks` | `bool` | Legacy alias retained for backward compatibility. |
| `multi_agent` | `bool` | Enables multi-agent subagent delegation. |
| `multi_agent_v2` | `bool` | Next-gen collaborative multi-agent engine. |
| `context_management` | `bool` | Automated token pruning and context compaction. |
| `tool_search` | `bool` | Dynamic on-demand tool and MCP routing. |
| `request_permissions` | `bool` | In-session runtime permission elevation dialogs. |
| `shell_snapshot_v2` | `bool` | Optimized shell state preservation across tool calls. |
| `exec_permission_approvals` | `bool` | Strict per-command approval checks beyond trusted whitelist. |
| `agentmemory` | `bool` | In-process integration with agentmemory MCP. |
| `fast_mode` | `bool` | Low-latency inference routing. |
| `steer` | `bool` | Mid-generation guidance and interruptibility. |
| `goals` | `bool` | Long-running goal persistence. |
| `unified_exec` | `bool` | Unified terminal and tool execution runtime. |
| `agent_message_board` | `bool` | In-process agent message routing and mailbox. |
| `code_mode` | `bool` | Dedicated code generation and execution sandbox mode. |
| `async_compaction` | `bool` | Background non-blocking conversation context compaction. |
| `concurrent_reasoning_summaries` | `bool` | Concurrent reasoning stream summarization. |
| `cwd_relative_turn_diffs` | `bool` | Workspace-relative turn diff calculation. |
| `daemon_auto_start` | `bool` | Auto-launch background assistance daemons. |
| `runtime_agent_instances` | `bool` | Dynamic runtime instantiation of subagents. |

---

## 5. Declarative Merge Policy & Preserved Keys

To ensure that in-session user selections (plugin installs, model downloads, NUX dismissals) are preserved across `xhs deploy`, the following key paths are protected in `catalog/agents/specs/codex.yaml`:

- `marketplaces`
- `plugins`
- `desktop`
- `tui.model_availability_nux`
- `mcp_servers`
- `model_providers`
- `profiles`
