---
name: zvec-search
description: >-
  Ultra-fast local-first hybrid code and workspace search using Alibaba Zvec and zvec-grep (zg).
  Combines ripgrep (exact/regex), BM25 (keyword ranking), and Vector Search (semantic meaning) via Reciprocal Rank Fusion (RRF).
  Use for domain concept discovery, cross-file hybrid retrieval, multi-modal workspace queries, and instant 1-hop code location.
---

# Zvec & zvec-grep (zg): Unified Hybrid Workspace Search

`zvec-search` integrates Alibaba's **Zvec** in-process vector engine and **zvec-grep (`zg`)** to provide production-grade, local-first hybrid search combining literal matching (`ripgrep`), lexical relevance (`BM25`), and dense semantic embeddings (`Vector`) fused via **Reciprocal Rank Fusion (RRF)**.

> **Token & Hop Efficiency**: Replaces 4–8 exploratory grep/read round-trips with a single hybrid query, delivering precise code locations with 90%+ prompt token savings.

---

## 🎯 When to Use zvec-search vs. Semble vs. Ripgrep

| Search Intent | Recommended Tool | Why |
| :--- | :--- | :--- |
| **Natural Language / Domain Concepts** (e.g. `"where do we validate token expiration and refresh tokens?"`) | **`zvec-search` (`zg`)** | Fuses BM25 + Vector + ripgrep with RRF for highest concept relevance |
| **AST Symbols & Similar Implementation** (e.g. `"find implementations similar to AuthHandler"`) | **`semble` (`search`, `find_related`)** | Deep AST structure awareness and ~1ms signature-level extraction |
| **Exact Literal / Regex / Rename** (e.g. `"find exact occurrences of VAR_NAME"`) | **`grep_search` / `ripgrep`** | Exhaustive string matching without scoring |
| **Call Graphs & Architecture** | **`codebase-memory-mcp` / `codegraph`** | Multi-hop dependency and trace analysis |

---

## 🛠 Tool Invocations

### 1. MCP Tool (`zvec-grep` / `zvec_grep_search`)

When the `zvec-grep` MCP server is active:

```json
{
  "query": "rate limiting middleware and token bucket algorithm",
  "path": ".",
  "top_k": 5,
  "mode": "hybrid"
}
```

#### Parameters:
- `query` (string, required): Natural language intent, keywords, or error context.
- `path` (string, optional): Target directory or workspace root (default: `"."`).
- `top_k` (int, optional): Number of top-ranked results to return (default: `5`).
- `mode` (string, optional): Retrieval mode:
  - `"hybrid"` (default): RRF fusion of ripgrep, BM25, and vector.
  - `"fts"`: BM25 lexical ranking only (zero embedding overhead).
  - `"vector"`: Dense semantic similarity only.
  - `"rg"`: Literal ripgrep matching.

---

### 2. CLI Invocation (`zg`)

When executing shell commands or sub-agent tasks:

```bash
# Unified hybrid search across workspace
zg "JWT expiration and refresh token logic"

# Lexical BM25 search (fast keyword ranking, no embedding required)
zg --fts "timeout connection retry"

# Semantic vector search
zg --vector "database migration runner"

# Target specific directory or file types
zg "schema validation" src/ --ext py,rs
```

## 🧠 Default Embedding Model (Harness Standard)

This harness standardizes on **`local/qwen3-embedding-0.6b`** as the default embedding model for all agent workspaces:
- **Multilingual & Cross-lingual**: Seamlessly bridges Japanese natural language queries (e.g. `"セキュリティポリシーの変換アダプター"`) with English codebases and documentation.
- **Large Context Window**: Supports up to **8,192 tokens** per chunk, allowing full classes, large functions, and detailed ADRs to be embedded without truncation.
- **Dense High-Fidelity**: 1,024 dimensions capturing subtle architectural relationships and semantics.
- **Configured via MCP**: Managed declaratively via `ZVEC_GREP_EMBEDDING: "local/qwen3-embedding-0.6b"` in MCP settings.

---

## 💡 Best Practices

1. **Start with Hybrid Search**: Use `zvec_grep_search` when you don't know the exact file name or symbol name.
2. **Direct Jump**: Use the exact file and line numbers returned by `zg` to view only the relevant lines (e.g. `view_file` with `StartLine`/`EndLine`). Never load whole files blindly.
3. **Progressive Indexing**: `zg` works instantly with `ripgrep + BM25` even without vector embeddings, and automatically scales to full semantic search with Qwen3.
