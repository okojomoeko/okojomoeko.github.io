---
name: crystallize
description: Consolidate related memories, actions, and observations into high-level structured knowledge and extract graph entities. Use when the user says "crystallize", "consolidate memory", "organize knowledge", "summarize learnings", or wants to extract structural lessons and graph relationships from recent work.
argument-hint: "[scope or concept]"
user-invocable: true
---

The user wants to crystallize and consolidate memories: $ARGUMENTS

## Quick start

```json
memory_crystallize {
  "olderThanDays": 0,
  "concept": "architecture"
}
```

Or trigger full consolidation pipeline:

```json
memory_consolidate {
  "tier": "all"
}
```

## Why

Raw observations and episodic memories can become fragmented over time. Crystallization condenses them into permanent semantic facts, procedures, and knowledge graph edges.

## Workflow

1. Identify the consolidation target:
   - For specific workflow or domain knowledge: call `memory_crystallize` with the relevant `concept` or `actionType`.
   - For full corpus consolidation and graph extraction: call `memory_consolidate` with `tier: "all"`.
2. Inspect the result for newly created crystals, lessons, and updated graph entities.
3. Report a concise summary to the user highlighting key synthesized takeaways.

## Anti-patterns

WRONG: Running consolidation on every single message turn (causes unnecessary LLM load).

RIGHT: Invoking consolidation at the end of significant milestones, after complex debugging sessions, or when explicitly requested.

## Checklist

- Target concept or scope is clearly identified.
- Appropriate consolidation tool (`memory_crystallize` or `memory_consolidate`) is selected.
- Key lessons and extracted graph relationships are communicated to the user.

## See also

- `remember`: save individual raw insights and decisions.
- `memory-graph`: query and explore extracted knowledge graph relationships.
