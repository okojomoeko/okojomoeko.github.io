---
title: "Semble (Semantic Code Search) \u2014 Usage Protocol"
---

# Semble (Semantic Code Search) — Usage Protocol

This project and harness integrate `semble` to provide blazing-fast, CPU-native local semantic code and document search.

## 🚨 Guidelines & Directives

1. **Semantic Search Priority for Exploration**:
   - Use `semble` as your primary exploration tool for locating where features, functions, types, configurations, or business logic are implemented when the exact location is unknown.
   - **DO NOT** use broad `grep_search`, `find_by_name`, or `Glob` for exploratory queries when you only need semantic context (e.g. "where is user authentication handled?").
   - **Direct File Operations**: When the user explicitly specifies a file to open/read (e.g., "open HANDOFF.md", "view pyproject.toml", or a known path), use your standard file reading tool directly without forcing semantic search.

2. **Targeted Reading (Direct Navigation)**:
   - When Semble returns a result with `file_path` and `line_number`, navigate directly to that target location.
   - Read only the targeted function or block needed for the task.
   - **DO NOT** scan or grep the repository repeatedly once the location has been identified.

3. **Tool Invocations**:
   - **MCP Tool**: Call `search` on the `semble` server with a natural language or identifier query.
     - Use `content: "code"` (default), `"docs"` (documentation/markdown), `"config"` (YAML/TOML/JSON), or `"all"`.
     - Use `max_snippet_lines: 10` (default) or `0` (locations only) to minimize prompt context bloat.
   - **Similar Code**: Call `find_related` on the `semble` server with `file_path` and `line` from prior results to discover related implementations.
   - **CLI Tool**: If MCP is unavailable in your environment, use `semble search "<query>" .` via shell.

4. **When Exact Search (Grep) is Allowed**:
   - Use exact string search (`grep`) ONLY when you need every single exact occurrence of a literal string (e.g. finding all callers before a rename refactor) or searching for exact compiler/runtime error strings.

5. **Token Preservation Benchmark**:
   - Semble returns only the relevant semantic chunks, saving **~99% of prompt tokens** compared to scanning entire codebases.
