# Pi Coding Agent Specification (v1.5.0 — November 2026 Update)

*Distilled from `earendil-works/pi` official documentation (`packages/coding-agent/docs/`), package ecosystem audits, and local LLM best-practice benchmarks.*

---

## 1. Configuration Hierarchy & Instruction Lifecycle

Pi Coding Agent coordinates configuration across user home and repository scopes:
- **Global Settings**: `~/.pi/agent/settings.json`
- **Global Models**: `~/.pi/agent/models.json`
- **Global MCP**: `~/.pi/agent/mcp.json`
- **Project Settings**: `.pi/settings.json`
- **Project MCP**: `.pi/mcp.json` (requires explicit project trust)
- **Project Guidelines**:
  - `APPEND_SYSTEM.md`: **Recommended.** Appends instructions to Pi's system prompt while strictly preserving Pi's built-in tool definitions, diff formatting, and tool-calling syntax.
  - `SYSTEM.md`: **Harmful for tool usage.** Completely replaces Pi's built-in system prompt, stripping `<tools>` descriptions and guidelines.
  - `AGENTS.md` / `AGENTS.override.md` / `CLAUDE.md`: Discovered hierarchically; loaded into context without requiring project trust.

---

## 2. Core Settings Specification (`settings.json`)

```json
{
  "$schema": "https://pi.dev/schemas/settings.schema.json",
  "defaultProvider": "custom-provider",
  "defaultModel": "qwopus3.8-27b-flash-abliterated-mxfp8-vision-mtplx",
  "defaultThinkingLevel": "medium",
  "defaultProjectTrust": "ask",
  "defaultTools": [
    "+codemode"
  ],
  "codemode": {
    "mode": "on",
    "inlineBudget": 3000
  },
  "packages": [
    "npm:@ogulcancelik/pi-codex-subagents",
    "npm:pi-git-commit",
    "npm:pi-hashline-edit-pro",
    "npm:@narumitw/pi-plan-mode",
    "npm:@juicesharp/rpiv-ask-user-question",
    "npm:@juicesharp/rpiv-todo",
    "npm:pi-tree-sitter",
    "npm:@ogulcancelik/pi-session-recall",
    "npm:@ogulcancelik/pi-model-thinking",
    "npm:@ogulcancelik/pi-model-agents",
    "npm:@ogulcancelik/pi-minimal-footer",
    "npm:pi-notify",
    "npm:@narumitw/pi-btw"
  ],
  "extensions": [
    "./extensions/closed-loop.ts",
    "./extensions/security-gate.ts"
  ],
  "thinkingBudgets": {
    "minimal": 1024,
    "low": 2048,
    "medium": 8192,
    "high": 16384
  },
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  },
  "tuiMode": "fullscreen",
  "terminal": {
    "showImages": true,
    "trueColor": "auto"
  },
  "retry": {
    "enabled": true,
    "maxRetries": 3,
    "baseDelayMs": 2000
  },
  "collapseChangelog": true,
  "subagents": {
    "defaultModel": "qwopus3.8-27b-flash-abliterated-mxfp8-vision-mtplx",
    "defaultProvider": "custom-provider",
    "agentOverrides": {
      "scout": {
        "model": "Ornith-1.5-9B-MLX-6bit",
        "thinking": "low"
      },
      "worker": {
        "model": "gemma-4-26B-A4B-it-qat-uncensored-heretic-mlx-vlm-4Bit",
        "thinking": "high"
      },
      "oracle": {
        "model": "qwopus3.8-27b-flash-abliterated-mxfp8-vision-mtplx",
        "thinking": "high"
      }
    }
  }
}
```

---

## 3. Local LLM Tuning & `models.json` Specification

For local inference engines (oMLX, llama-server, vLLM, LM Studio) running Qwen3.x / Qwopus on Apple Silicon:

### Critical Invariants
1. **Context Window Sizing**: Set `contextWindow: 65536` (64K). Advertised 256K windows trigger severe memory bloat and attention dilution (Context Rot) on 27B-class models.
2. **`compat` Flags**:
   - `thinkingFormat: "qwen-chat-template"`: Formats thinking flags via template arguments, preventing raw `<think>` delimiters from corrupting `tool_calls` JSON.
   - `thinkingTokenBudgetField: "thinking_budget_tokens"`: Enforces reasoning token limits.
   - `requiresReasoningContentOnAssistantMessages: true`: Drops old thinking tokens from replayed multi-turn history, preventing token explosion and "thought echo".
   - `supportsDeveloperRole: false`: Forces `role: "system"` (local daemons reject `developer`).
   - `maxTokensField: "max_tokens"`: Standard OpenAI completions parameter.
3. **Sampling Discipline**:
   - Thinking Mode (`temperature: 0.6`, `top_p: 0.95`, `top_k: 20`, `min_p: 0.0`, `presence_penalty: 0.0`). Never use greedy decoding (`temperature: 0`) with thinking.
   - Non-Thinking Mode (`off`): `temperature: 0.7`, `top_p: 0.8`, `presence_penalty: 1.5`.

---

## 4. Security & Hard Guardrail Architecture

Because Pi core executes commands without internal sandboxing, security is enforced via:
1. **Deterministic Security Gate Extension (`security-gate.ts`)**:
   - Intercepts `tool_call` before execution.
   - Regex AST matching on bash for destructive operations (`rm -rf /`, `sudo`, `chmod 777`, `mkfs`, `dd`, `curl | bash`).
   - Automatically blocks and terminates destructive commands in headless / loop mode.
   - Restricts read/write operations on credentials (`.env`, `~/.ssh`, `~/.aws`, `~/.gnupg`) and harness configs (`~/.pi`, `~/.gemini`, `~/.codex`).
2. **Deterministic Safe Packages**:
   - `pi-git-commit`: Prevents rogue git force pushes or hard resets via bash.
   - `@narumitw/pi-plan-mode`: Enforces read-only isolation during research and design.
   - *Eliminated*: `@ogulcancelik/pi-auto-permissions` (vulnerable to prompt injection) and `@ogulcancelik/pi-quit-and-delete` (accidental session deletion).

---

## 5. Multi-Tier Subagents Hierarchy & VRAM Discipline

Pi delegates complex tasks using a 3-tier model hierarchy:
- **Tier 1 (Oracle / Orchestrator)**: `qwopus3.8-27b` (Global design, task decomposition, root cause analysis).
- **Tier 2 (Worker / Coder)**: `gemma-4-26B` (Code implementation, TDD tests, focused refactors).
- **Tier 3 (Scout / Inspector)**: `Ornith-1.5-9B-MLX-6bit` (Fast file exploration, AST grep, log verification).
  - *Quantization Rule*: Avoid 2-bit models (e.g. Ternary-Bonsai); they suffer high tool-call JSON syntax failures. Use 6-bit 9B or 4-bit 14B/27B.
  - *Single-Model Alternative (<=64GB Unified Memory)*: Run 27B single-model resident in RAM with dynamic thinking budgets (`off` for scout, `medium` for worker, `high` for oracle) to achieve 100% prompt prefix cache reuse and zero swapping latency.

---

## 6. Built-in MCP Integration & Codemode Architecture

- **Native `mcp.json`**: Supported natively by Pi core without legacy adapters (`pi-mcp-adapter` is obsolete).
- **Codemode (`builtin:codemode`)**: Executes JavaScript in a QuickJS WASM sandbox. MCP tools default to `codemode` exposure (`searchTools()`), saving ~90% of prefill tokens.
- **Direct Tools**: Only assign `exposure: "direct"` to 4–8 frequently used tools to avoid attention dilution on sub-30B models.
