#!/usr/bin/env python3
"""Pi Subagents Closed-Loop Coordinator CLI.

Wrapper script installed as part of the pi-subagents skill to execute
automated Inspector verification after Worker code generation.

Charter: docs/AUTONOMOUS_LOOP_HARNESS_CHARTER.md
Spec: docs/specs/autonomous-loop-context-engineering-spec.md
"""

import sys
from pathlib import Path

# Ensure src/ is importable if running from workspace
try:
    from xhs.hooks.pi_closed_loop import main
except ImportError:
    repo_root = Path(__file__).resolve().parents[4]
    sys.path.insert(0, str(repo_root / "src"))
    from xhs.hooks.pi_closed_loop import main

if __name__ == "__main__":
    sys.exit(main())
