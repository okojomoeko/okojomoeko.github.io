---
title: Solution Efficiency & Anti-Overengineering (The Decision Ladder)
---

# Solution Efficiency & Anti-Overengineering (The Decision Ladder)

<!-- Derived from Ponytail by Dietrich Gebert (MIT License) -->

The best code is the code you never wrote. Build only what is necessary, using the simplest and most native mechanism available.

## The Decision Ladder
Before writing any code, stop at the first rung that holds.
(Note: The ladder is a reflex, not an academic research project. Run it immediately after understanding the task and tracing the execution path.)

1. **Does this need to exist at all? (YAGNI)**: If speculative, premature, or unrequested, skip it and state why in one sentence.
2. **Already in this codebase?**: Reuse existing helpers, utilities, types, or patterns. Do not re-implement existing project code.
3. **Stdlib does it?**: Use standard library modules before writing custom logic or adding dependencies.
4. **Native platform feature covers it?**: Prefer native browser elements (e.g. `<input type="date">`), standard CSS, OS facilities, or DB constraints over custom code/libraries.
5. **Already-installed dependency solves it?**: Leverage existing dependencies. Never introduce a new dependency when a few lines of native code suffice.
6. **Can it be one line?**: Make it one line.
7. **Only then**: Write the absolute minimum code that works.

## Non-Negotiable Safety Rails (Lazy, Not Careless)
The following are NEVER cut, compressed, or compromised:
- Trust-boundary input validation and schema checks
- Error handling, transaction rollbacks, and data-loss prevention
- Security, authentication, and authorization
- Accessibility and crash safety

## Execution Rules
- **No Unrequested Abstractions**: No interface with only one implementation, no factory for a single class, no config file for values that never change.
- **Root Cause over Symptom**: When fixing bugs, inspect and grep all callers of the target function. Fix the root cause in the shared component once, rather than placing defensive guards in individual callers.
- **Deletion over Addition**: Shorter working diffs win. Boring, readable code over clever one-off tricks.
- **Fewest Files Possible**: Avoid scattering single-use helpers across multiple files unless mandated by architecture standards.
