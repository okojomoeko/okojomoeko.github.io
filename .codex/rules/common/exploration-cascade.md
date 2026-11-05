# Token-Efficient Exploration Cascade

> This rule dictates how agents should explore a codebase to maximize speed, precision, and token efficiency.

## The Cascade Strategy (Strict Tool Precedence)

When searching for code, locating features, tracking dependencies, or recalling decisions, you **MUST** follow this tool progression. **DO NOT** default to `ls`, `grep_search`, `find_by_name`, or reading whole files.

### Direct File Handling (Targeted Path Known)
- When the user asks to read, edit, or inspect a **specifically named file** (e.g. `HANDOFF.md`, `README.md`, `pyproject.toml`, or a precise path), use your standard file reading tool directly.
- For all other exploratory inquiries, you **MUST** use Tier 1 or Tier 2 first.

### Tier 1: Hybrid Concept & Symbol Search (MANDATORY FIRST ACTION)
**Tools**:
- **Domain Concepts & Natural Language (Hybrid RRF)**: `zvec-grep` (`zvec_grep_search` or CLI `zg`)
  - **MANDATORY for all conceptual questions, cross-file logic discovery, or natural language inquiries** (e.g. `"How does authentication work?"`, `"rate limiting retry"`, `"セキュリティポリシーの変換"`).
  - Uses `ripgrep + BM25 + Qwen3 vector` with Reciprocal Rank Fusion (RRF) to locate exact line spans in 1 hop.
- **AST Structures & Symbol Similarity**: `semble` (`search`, `find_related`)
  - **MANDATORY for AST symbol definitions, function signatures, and finding similar implementations** (e.g. `find_related`).
- **Token & Latency Benefit**: Returns exact symbol/chunk spans, saving **~90–99% of prompt tokens** compared to broad file scanning.
- **In-Memory 1-Hop Optimization (10 KB Chunking Threshold)**:
  - Constrain search parameters (e.g. `top_k: 3~5`, targeted line spans) so that the tool response payload remains strictly **under 10 KB**.
  - In modern harnesses (such as Antigravity v1.4.7+), responses under 10 KB are returned directly in-memory to the LLM context without disk redirection, eliminating the redundant disk write and subsequent `read_file` roundtrip (saving 1-2 turn roundtrips and disk I/O latency).

### Tier 2: Structural & Call Graph Tracing (MANDATORY FOR DEPENDENCIES)
**Tools**: `codebase-memory-mcp` (`trace_call_path`, `get_architecture`, `query_graph`), `codegraph-context` (`analyze_code_relationships`)
- Once the symbol is located, trace callers/callees and dependency graphs without reading raw file contents.
- Never manually grep for function names across the entire workspace when graph tools are available.

### Tier 3: Episodic & Historical Decision Recall
**Tools**: `agentmemory` (`memory_recall`, `memory_smart_search`), `lightrag` (`lightrag_query`), `cognee` (`recall`)
- For questions about *why* something was built, past bugs, or architectural decisions (ADRs), query agent memory before assuming or asking the user.

### Tier 4: Targeted Line-Range Reading
**Tools**: Targeted class/function reading, line-range file viewing (`view_file` with StartLine/EndLine)
- Only inspect the specific 20–50 line range identified in Tier 1–3. Loading entire 500+ line files is strictly prohibited.

### Tier 5: Fallback (Grep / Cat)
**Tools**: `grep_search`, `read_file` (Full)
- Allowed ONLY as an absolute last resort if Tier 1–3 tools return zero matches, or when performing full-codebase string refactoring.

## Why this matters
Grep and full-directory scans consume enormous context and spawn unnecessary sub-agents. The Cascade Strategy leverages local intelligence to give you exactly what you need in one or two tool calls.
