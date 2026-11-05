#!/usr/bin/env python3
"""Script wrapper to trigger XHS autonomous loop orchestration from skills or agents."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from xhs.engine.loop_orchestrator import LoopOrchestrator


def main() -> None:
    parser = argparse.ArgumentParser(description="Run autonomous engineering loop with Git Worktree isolation")
    parser.add_argument("goal", help="Task goal or prompt for the autonomous loop")
    parser.add_argument(
        "--agent",
        "-a",
        default="pi",
        choices=["pi", "antigravity", "codex", "claude-code"],
        help="Target agent harness",
    )
    parser.add_argument("--test-cmd", "-t", default=None, help="Deterministic test probe command (Exit Code 0)")
    parser.add_argument("--static-cmd", "-s", default=None, help="Static verification command")
    parser.add_argument("--profile", "-p", default="global-dev", help="XHS profile to deploy into worktree")
    parser.add_argument("--max-iterations", "-m", type=int, default=10, help="Maximum iterations")
    parser.add_argument("--no-merge", action="store_true", help="Do not auto-merge on success")
    parser.add_argument("--no-worktree", action="store_true", help="Run in-place without worktree isolation")

    args = parser.parse_args()

    orchestrator = LoopOrchestrator()
    result = orchestrator.run_loop(
        goal=args.goal,
        agent=args.agent,
        test_cmd=args.test_cmd,
        static_cmd=args.static_cmd,
        profile=args.profile,
        max_iterations=args.max_iterations,
        auto_merge=not args.no_merge,
        use_worktree=not args.no_worktree,
    )

    if result.passed:
        print(f"✅ Autonomous loop PASSED for goal: '{args.goal}'")
        if result.merged:
            print("  Successfully squash-merged into parent branch.")
        sys.exit(0)
    else:
        print(f"🛑 Autonomous loop FAILED or ESCALATED for goal: '{args.goal}'", file=sys.stderr)
        if result.error_message:
            print(f"  Error: {result.error_message}", file=sys.stderr)
        sys.exit(result.exit_code or 1)


if __name__ == "__main__":
    main()
