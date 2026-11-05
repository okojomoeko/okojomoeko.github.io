/**
 * Pi Coding Agent Extension: Closed-Loop Subagents Coordinator & Model Guard
 *
 * Implements:
 * 1. Model Routing & VRAM Pre-flight Guard on tool_call:
 *    - Injects Ornith 9B (thinking: low) for Scout / Researcher / Inspector.
 *    - Injects Gemma 26B (thinking: high) for Worker / Coder / Reviewer.
 *    - Guards against VRAM blowout by preventing default 27B model inheritance.
 * 2. Automated Tier 2 Worker -> Done Probe Closed-Loop on tool_result:
 *    - Executes Universal Done Probe (python3 -m xhs.hooks.done_probe --agent pi).
 *    - On failure, marks tool result as error and injects structured episodic roll-up.
 *    - On Doom Loop / Max Iterations, stops with clean surrender and ESCALATION.md.
 *
 * Charter: docs/AUTONOMOUS_LOOP_HARNESS_CHARTER.md
 * Spec: docs/specs/autonomous-loop-context-engineering-spec.md
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  const SCOUT_MODEL = "Ornith-1.5-9B-MLX-6bit";
  const WORKER_MODEL = "gemma-4-26B-A4B-it-qat-uncensored-heretic-mlx-vlm-4Bit";

  // Session startup banner
  pi.on("session_start", async (_event, ctx: ExtensionContext) => {
    if (ctx.hasUI) {
      ctx.ui.setStatus("pi-subagents-loop", "LCGE Closed-Loop Coordinator & Model Guard Active");
    }
  });

  // 1. Tool Call Interceptor: Enforce Model & Thinking Routing to Guard VRAM
  pi.on("tool_call", async (event, ctx: ExtensionContext) => {
    if ((event.toolName === "spawn_agent" || event.toolName === "subagent") && event.input) {
      const input = event.input as Record<string, any>;
      const taskName = String(input.task_name || input.name || "").toLowerCase();
      const agentRole = String(input.agent || input.agent_type || "").toLowerCase();

      // Tier 3: Scout / Inspector / Researcher -> 9B Fast Model
      if (
        taskName.startsWith("scout") ||
        taskName.startsWith("inspector") ||
        taskName.startsWith("research") ||
        agentRole === "scout" ||
        agentRole === "inspector" ||
        agentRole === "researcher"
      ) {
        input.model = SCOUT_MODEL;
        input.thinking = "low";
        if (ctx.hasUI) {
          ctx.ui.notify(
            `[LCGE Guard] Injected Scout Model (${SCOUT_MODEL}, thinking: low) for ${taskName || agentRole}`,
            "info",
          );
        }
      }
      // Tier 2: Worker / Coder / Reviewer -> 26B Coding Model
      else if (
        taskName.startsWith("worker") ||
        taskName.startsWith("coder") ||
        taskName.startsWith("review") ||
        agentRole === "worker" ||
        agentRole === "coder" ||
        agentRole === "reviewer"
      ) {
        input.model = WORKER_MODEL;
        input.thinking = "high";
        if (ctx.hasUI) {
          ctx.ui.notify(
            `[LCGE Guard] Injected Worker Model (${WORKER_MODEL}, thinking: high) for ${taskName || agentRole}`,
            "info",
          );
        }
      }
      // Fallback: Default to Worker 26B if unspecified, preventing 27B from blowing 80GB VRAM ceiling
      else if (!input.model) {
        input.model = WORKER_MODEL;
        if (ctx.hasUI) {
          ctx.ui.notify(
            `[LCGE Guard] Safe Fallback: Injected Worker Model (${WORKER_MODEL}) to guard VRAM`,
            "info",
          );
        }
      }
    }
  });

  // 2. Tool Result Interceptor: Detect Worker completion and run Done Probe
  pi.on("tool_result", async (event, ctx: ExtensionContext) => {
    if (
      event.toolName === "spawn_agent" ||
      event.toolName === "subagent" ||
      event.toolName === "wait_agent" ||
      event.toolName === "wait_all_agents"
    ) {
      const input = (event as any).input || {};
      const taskName = String(input.task_name || input.name || "").toLowerCase();
      const agentRole = String(input.agent || input.agent_type || "").toLowerCase();

      // Only execute verification probe if worker completed
      const isWorker =
        taskName.startsWith("worker") ||
        taskName.startsWith("coder") ||
        agentRole === "worker" ||
        agentRole === "coder" ||
        event.toolName === "spawn_agent"; // Any generic spawn completion triggers verification

      if (!isWorker) {
        return;
      }

      if (ctx.hasUI) {
        ctx.ui.notify("Worker finished. Objective Done Probe executing...", "info");
      }

      try {
        const cmd = "xhs probe check --agent pi";
        let stdout = "";
        let exitCode = 0;

        try {
          stdout = execSync(cmd, {
            encoding: "utf-8",
            cwd: ctx.cwd,
            stdio: ["ignore", "pipe", "pipe"],
          });
          exitCode = 0;
        } catch (err: any) {
          stdout = err.stdout ? String(err.stdout) : "";
          exitCode = err.status || 1;
        }

        if (exitCode === 0) {
          // Check if it surrendered or actually passed
          if (stdout.includes("followup_message")) {
            // Surrender report
            const parsed = JSON.parse(stdout);
            if (ctx.hasUI) {
              ctx.ui.notify("🛑 [Done Probe Surrendered] See ESCALATION.md", "error");
            }
            return {
              isError: true,
              content: [{ type: "text", text: parsed.followup_message || "Done probe surrendered." }],
            };
          }
          if (ctx.hasUI) {
            ctx.ui.notify("✅ Closed-Loop Verified: Objective verification passed!", "info");
          }
          return;
        }

        // Probe failed (Exit 1): Intercept and inject error feedback
        let feedback = "Objective verification failed. Please inspect tests and repair.";
        try {
          const parsed = JSON.parse(stdout.trim());
          if (parsed.followup_message) {
            feedback = parsed.followup_message;
          }
        } catch {
          if (stdout.trim()) {
            feedback = stdout.trim();
          }
        }

        if (ctx.hasUI) {
          ctx.ui.notify("⚠️ Verification probe failed. Intercepting completion & re-dispatching...", "warning");
        }

        return {
          isError: true,
          content: [
            {
              type: "text",
              text: feedback,
            },
          ],
        };
      } catch (err: any) {
        if (ctx.hasUI) {
          ctx.ui.notify(`Done Probe execution error: ${err.message}`, "error");
        }
      }
    }
  });

  // 3. Agent End Interceptor: Verify Objective Criteria before allowing session to stop
  let isProbing = false;
  pi.on("agent_end", async (_event, ctx: ExtensionContext) => {
    if (isProbing) return;
    const probeConfigPath = join(ctx.cwd, ".xhs", "probe.json");
    if (!existsSync(probeConfigPath)) {
      return;
    }

    isProbing = true;
    try {
      const cmd = "xhs probe check --agent pi";
      let stdout = "";
      let exitCode = 0;

      try {
        stdout = execSync(cmd, {
          encoding: "utf-8",
          cwd: ctx.cwd,
          stdio: ["ignore", "pipe", "pipe"],
        });
        exitCode = 0;
      } catch (err: any) {
        stdout = err.stdout ? String(err.stdout) : "";
        exitCode = err.status || 1;
      }

      if (exitCode === 0) {
        // Check if escalated (surrendered) or truly passed
        if (stdout.includes("escalated") || stdout.includes("ESCALATION.md")) {
          if (ctx.hasUI) {
            ctx.ui.notify("🛑 [Done Probe Surrendered] See ESCALATION.md", "error");
          }
          return;
        }
        if (ctx.hasUI) {
          ctx.ui.notify("✅ Closed-Loop Verified: Objective verification passed!", "info");
        }
        return;
      }

      // Probe failed (Exit 1): Intercept stop & inject error feedback
      let feedback = "Objective verification failed. Please inspect tests and repair.";
      try {
        const parsed = JSON.parse(stdout.trim());
        if (parsed.followup_message) {
          feedback = parsed.followup_message;
        }
      } catch {
        if (stdout.trim()) {
          feedback = stdout.trim();
        }
      }

      if (ctx.hasUI) {
        ctx.ui.notify("⚠️ Verification probe failed. Dispatching retry loop...", "warning");
      }

      pi.sendUserMessage(feedback, { deliverAs: "followUp" });
    } catch (err: any) {
      if (ctx.hasUI) {
        ctx.ui.notify(`Done Probe execution error: ${err.message}`, "error");
      }
    } finally {
      isProbing = false;
    }
  });

  // 3. Custom command: /verify-loop
  pi.registerCommand("verify-loop", {
    description: "Run objective Done Probe verification",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Running Objective Done Probe...", "info");
      try {
        const out = execSync("xhs probe check --agent pi", {
          encoding: "utf-8",
          cwd: ctx.cwd,
          stdio: ["ignore", "pipe", "pipe"],
        });
        ctx.ui.notify(`✅ Probe passed: ${out}`, "info");
      } catch (err: any) {
        ctx.ui.notify(`🛑 Probe failed:\n${err.stdout || err.message}`, "error");
      }
    },
  });
}