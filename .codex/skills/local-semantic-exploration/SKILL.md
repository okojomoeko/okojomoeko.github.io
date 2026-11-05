---
name: local-semantic-exploration
description: >-
  Explore codebases and documentation using a hybrid local-first architecture (Vector + Graph).
  Prioritizes Semble for sub-second ~99% token-saving semantic code and document search,
  codebase-memory-mcp for AST graph queries and call-path tracing, and codegraph for framework-aware routing.
  Triggers when the user asks about code structure, architecture, dependencies, implementations, or high-level concepts.
---

# Local Semantic Exploration (Hybrid Vector/Graph Architecture)

This skill enables extreme token efficiency and deep structural intelligence by prioritizing local semantic search (`semble`) and AST graph queries over speculative file reading.

## Core Philosophy: The Exploration Cascade

To maximize token efficiency and speed, you MUST follow this **Cascade Strategy** when exploring the codebase. Never skip directly to `grep` or file reading without trying the higher-tier tools first.

1.  **Tier 1: Semantic Search (Semble)**: Fast, token-efficient natural language and symbol search (~99% fewer tokens). Use this first to find *where* relevant logic lives based on meaning, intent, or symbol name.
2.  **Tier 2: Structural Map (Graph)**: Use `codebase-memory-mcp` (AST/Calls) and `codegraph` (Framework Routes) to trace dependencies and execution paths from the entry points found in Tier 1.
3.  **Tier 3: Targeted Reading**: Use `codebase-memory-mcp:get_code_snippet` or read only the targeted function/class without loading entire files.
4.  **Tier 4: Grep/Cat (Fallback)**: Only use traditional search/read tools for exact string matches, error messages, or when the higher-tier tools fail to return results.

## Exploration Workflow

### Step 1: Semantic Entry (Semble)
When looking for a concept or implementation (e.g., "how is authentication handled?"):
- **MCP Tool**: Call `search` on `semble` with `query: "authentication flow"`, `repo: "."`.
- **Search Content**: Pass `content: "docs"` for markdown/documentation, `content: "config"` for YAML/TOML/JSON configs, or `content: "all"` for everything.
- **Snippet Compression**: Use `max_snippet_lines: 10` (default) or `0` (file path & line numbers only) to keep context minimal.
- **Discover Similar Code**: Use `find_related` on `semble` with `file_path` and `line` from a search result to locate other implementations of an interface or pattern.

### Step 2: Structural Trace (Graph)
Once you have the starting file or function from Semble:
- Use `codebase-memory:trace_path` to trace upstream (callers) or downstream (callees).
- Use `codegraph:routes` if it's a web project to map URL patterns to the handler you found.

### Step 3: Impact Analysis
Before modifying a symbol:
- Use `codegraph:affected` or `codebase-memory:search_graph` to see which files and tests depend on it.

### Step 4: Concept Exploration (Docs RAG)
- Use Semble with `content: "docs"` or query `AnythingLLM` if the answer lies in project design documents or notes.

## Tool Matrix

| Task | Primary Tool | Tool Identifier | Key Options / Arguments |
| :--- | :--- | :--- | :--- |
| **Semantic Code Search** | `semble` | `search` | `query`, `repo`, `content: "code"`, `max_snippet_lines: 10` |
| **Documentation Search** | `semble` | `search` | `query`, `content: "docs"`, `max_snippet_lines: 10` |
| **Configuration Search** | `semble` | `search` | `query`, `content: "config"`, `max_snippet_lines: 10` |
| **Similar Code Discovery** | `semble` | `find_related` | `file_path`, `line`, `repo`, `top_k` |
| **Call Chain Tracking** | `codebase-memory-mcp` | `trace_path` | `symbol`, `depth: 1` or `2` |
| **Architecture Overview** | `codebase-memory-mcp` | `get_architecture` | high-level structural map |
| **Specific Code Snippet** | `codebase-memory-mcp` | `get_code_snippet` | `symbol`, `file_path` |
| **Web Routes/Handlers** | `codegraph` | `routes` | endpoint to handler mapping |
| **Impact Analysis** | `codegraph` | `affected` | target symbol |

## Efficiency Tips
- **Trust the Cascade**: Do not use `grep` or `read_file` until you have exhausted `semble` and graph queries. `semble` uses ~99% fewer tokens than grep+read.
- **Depth Control**: In `trace_path`, start with `depth=1` or `depth=2`.
- **Navigate Directly**: Once `semble` returns the line and file, open only that specific range. Never re-search or grep for the same keywords.
