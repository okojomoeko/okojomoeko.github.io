---
name: semble
description: >-
  Fast and token-efficient semantic code search using Semble.
  Retrieves exact code snippets in ~1ms using ~99% fewer tokens than grep+read.
  Use for finding implementations, understanding logic, locating symbols, discovering related code (find-related),
  and searching documentation/configuration across local and remote repositories.
---

# Semble: Fast & Accurate Code Search for Agents

`semble` is a high-performance, local-first code search tool designed specifically for coding agents. It matches the retrieval quality of code-specialized transformer models while running entirely on CPU in ~1ms with zero API keys or external services.

> **Token Efficiency**: Semble returns only the relevant chunks (function/class signature + body), saving up to **99% of prompt tokens** compared to scanning files with grep/cat/read_file.

---

## 🎯 When to Use Semble (Prioritize First)

**ALWAYS use Semble as your primary exploration tool** when:
- Finding *where* a feature, concept, or business logic is implemented (e.g., `"authentication flow"`, `"rate limiter middleware"`).
- Locating functions, classes, types, or methods by description or symbol name (e.g., `"save_pretrained"`, `"user password hashing"`).
- Discovering related code or implementations of an interface (`find_related`).
- Searching project documentation or markdown files (`content: "docs"`).
- Searching configuration files like YAML, TOML, JSON (`content: "config"`).
- Exploring unfamiliar repositories without blowing up your context budget.

**When to use Grep instead**:
- Only when you need *every single exact occurrence* of a literal string (e.g., renaming a variable across the entire repo).
- Searching for exact compiler error messages or UUIDs.

---

## 🛠 Tool Invocations by Harness

### 1. MCP Server Tools (Native Tool Calls)

When `semble` MCP server is active, use the following tools:

#### A. `search` (Server: `semble`, Tool: `search`)
Searches the codebase using semantic intent or identifier names.

```json
{
  "query": "JWT token verification and expiry check",
  "repo": ".",
  "top_k": 5,
  "max_snippet_lines": 10,
  "content": "code"
}
```

| Argument | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `query` | `string` | *(required)* | Natural language intent or symbol name (e.g. `"parse CLI arguments"`). |
| `repo` | `string` | *(required)* | Local project root (`"."` or absolute path) or git URL (`https://...`). |
| `top_k` | `int` | `5` | Number of top results to return. |
| `max_snippet_lines`| `int | null` | `10` | `10`: signature + first body lines (concise, default).<br>`0`: file path and line numbers only (ultra-lean).<br>`null`: full chunk (~10–20 lines). |
| `content` | `string` | `"code"` | `"code"` (default), `"docs"` (prose/markdown), `"config"` (yaml/toml/json), `"all"`. |

#### B. `find_related` (Server: `semble`, Tool: `find_related`)
Finds code similar to a specific file and line (e.g. all implementations of a trait/interface, all handlers with similar logic).

```json
{
  "file_path": "src/auth/jwt.py",
  "line": 42,
  "repo": ".",
  "top_k": 5,
  "max_snippet_lines": 10,
  "content": "code"
}
```

---

### 2. CLI Invocation (Shell Tool / Sub-agents)

If MCP is unavailable or when executing in sub-agents/scripts, call the CLI directly:

```bash
# Basic semantic search (code)
semble search "authentication flow" .

# Compact output (first 10 lines of each result)
semble search "authentication flow" . --max-snippet-lines 10

# Search documentation (markdown, rst)
semble search "deployment guide" . --content docs

# Search configuration files (toml, yaml, json)
semble search "database host port" . --content config

# Search everything (code + docs + config)
semble search "rate limiting" . --content all

# Discover code similar to a known location
semble find-related src/auth.py 42 .

# Check token savings statistics
semble savings

# Fallback if binary is not directly in PATH
uvx --from "semble[mcp]" semble search "query" .
```

---

## 📋 Best Practices & Query Crafting

### 1. Write Intent-Focused Queries
- **GOOD**: `"user registration validation logic"`, `"S3 upload with retry"`, `"handle websocket disconnect"`
- **GOOD (Symbol Name)**: `"verify_signature"`, `"DatabasePool"`, `"handle_event"`
- **AVOID**: `"error: line 45 null pointer"` (use grep for exact stack trace strings)

### 2. Follow the Semble 4-Step Exploration Workflow
1. **Search**: Call `semble:search` with a focused query.
2. **Examine Snippet**: Read the returned signature and first lines to verify relevance.
3. **Targeted Read**: Navigate directly to the returned `file_path` and `line_number`. Inspect only the required function/class.
4. **Never Re-Grep**: Do not grep for the same keywords after Semble has already located the file and line.

### 3. Adjust Snippet Size for Context Budget
- Use `max_snippet_lines: 0` when you only need candidate file paths and line ranges.
- Use `max_snippet_lines: 10` (default) for initial confirmation.
- Use `max_snippet_lines: null` if you need the full code chunk directly without opening the file.

---

## 🔧 Troubleshooting & Maintenance

- **Cache Location**: Indexes are stored in the OS cache (`~/Library/Caches/semble` on macOS, `~/.cache/semble` on Linux).
- **Index Updates**: Indexes are updated automatically when files change.
- **Ignore Rules**: Honors `.gitignore` and `.sembleignore`. Exclude generated files or force-include extensions (e.g. `!*.proto`) in `.sembleignore`.
- **Clear Cache**: Run `semble clear index` or `semble clear all` if index corruption is suspected.
- **View Savings**: Run `semble savings` to verify token savings metrics.
