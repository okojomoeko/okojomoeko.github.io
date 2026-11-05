---
title: "Zvec & zvec-grep (Hybrid Code & Workspace Search) \u2014 Usage Protocol"
---

# Zvec & zvec-grep (Hybrid Code & Workspace Search) — Usage Protocol

This harness integrates Alibaba **Zvec** and **zvec-grep (`zg`)** to provide ultra-fast, local-first hybrid search combining `ripgrep`, `BM25`, and `Vector Search` fused by **Reciprocal Rank Fusion (RRF)**.

## 🚨 Guidelines & Directives

1. **Hybrid Search Priority for Concept Exploration**:
   - Use `zvec-grep` (`zvec_grep_search` or `zg`) when searching for domain concepts, multi-file architectures, or natural language questions where the exact symbol or file name is unknown (e.g., `"how is session expiration handled?"`, `"rate limiter bucket"`).
   - **DO NOT** execute multi-round speculative `grep` and `read_file` loops when a single hybrid query can directly rank and locate relevant sections.

2. **Exploration Tool Selection Matrix**:
   - **Hybrid Concept & Domain Discovery**: `zvec-grep` (`zvec_grep_search` / `zg`) — RRF fusion across literal, lexical, and vector.
   - **AST & Signature Similarity**: `semble` (`search`, `find_related`) — Exact code structure and signature extraction.
   - **Exact String / Rename / Error Matching**: `grep_search` / `ripgrep` — Exhaustive literal text matches.
   - **Dependency / Call Graph Tracing**: `codebase-memory-mcp` / `codegraph` — Call paths and architecture graphs.

3. **Targeted Reading**:
   - After `zg` or `zvec_grep_search` returns ranked file locations and line numbers, navigate directly to that snippet.
   - Avoid reading whole files; load only the necessary line range (`StartLine` to `EndLine`).

4. **Progressive Fallback & Default Model**:
   - The harness standardizes on **`local/qwen3-embedding-0.6b`** as the default embedding model to support bilingual (Japanese/English) cross-lingual semantic queries and 8,192-token contexts.
   - `zvec-grep` operates seamlessly without external embedding models using `ripgrep + BM25` lexical ranking, and elevates to dense vector scoring with Qwen3 automatically.
