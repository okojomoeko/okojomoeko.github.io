---
name: memory-graph
description: Query and traverse the agentmemory knowledge graph, inspect entity connections, and discover structural dependencies across memories. Use when the user asks about "related concepts", "knowledge graph", "connections between concepts", or needs structural relationship mapping.
argument-hint: "[entity name or topic]"
user-invocable: true
---

The user wants to explore knowledge graph relationships for: $ARGUMENTS

## Quick start

```json
memory_graph_query {
  "query": "authentication flow",
  "maxDepth": 2
}
```

Or query specific relationships:

```json
memory_relations {
  "name": "JWTAuth"
}
```

## Why

Knowledge graph relationships reveal connections and dependencies between concepts, decisions, and files that simple semantic search might miss.

## Workflow

1. Extract the core entity or concept name from `$ARGUMENTS`.
2. Query the graph using `memory_graph_query` (with `maxDepth: 1` or `2`) or `memory_relations`.
3. Analyze connected nodes (concepts, memories, files) and edge types (`relates_to`, `depends_on`, `implements`, etc.).
4. Present a structured view of the graph traversal to the user.

## Anti-patterns

WRONG: Assuming connections exist without querying the graph.

RIGHT: Performing a targeted graph query and presenting actual verified node and edge relationships.

## Checklist

- Query specifies depth (keep low, 1-2 for performance).
- Relationships, connected entities, and edge reasons are clearly explained.

## See also

- `crystallize`: distill memories and extract graph entities.
- `recall`: hybrid semantic and keyword search across memories.
