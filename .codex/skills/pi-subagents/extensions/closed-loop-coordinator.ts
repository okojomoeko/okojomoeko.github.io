/**
 * Pi Coding Agent Extension: Closed-Loop Subagents Coordinator & Clean-Slate Guard
 *
 * Implements (Compliant with ADR-0034 and ADR-0035):
 * 1. Clean-Slate Subagents & Universal Context Subgraph Projection:
 *    - Injects isolated session keys (isolated-${Date.now()}) and disables history sharing.
 *    - Projects task directives into a bounded context subgraph envelope (<= 2,000 tokens)
 *      via Universal LCGE Context Projector (`xhs context project`).
 * 2. Dynamic SSoT Model Routing:
 *    - Reads SSoT from catalog/components/settings/local_llm.json.
 *    - Routes Scout / Researcher / Inspector to fast_model (thinking: low).
 *    - Routes Worker / Coder / Reviewer to coding_model (thinking: high).
 * 3. Two-Stage Maker/Checker Split & Objective Done Probe Verification (ADR-0035):
 *    - Executes Universal Done Probe with Dogfooding Walkthrough (`xhs probe check --walkthrough --agent pi`) upon Worker completion.
 *    - Automatically intercepts failures and injects corrective feedback loop.
 *
 * Charter: docs/AUTONOMOUS_LOOP_HARNESS_CHARTER.md
 * ADR: docs/adr/0034-universal-context-subgraph-projection-and-clean-slate-subagents.md
 * ADR: docs/adr/0035-maker-checker-split-and-dogfooding-protocol.md
 */

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

interface LocalLLMConfig {
  coding_model?: string;
  fast_model?: string;
  model?: string;
}

/**
 * Resolve model configuration from SSoT (catalog/components/settings/local_llm.json).
 */
function resolveSSoTModels(cwd: string): { scoutModel: string; workerModel: string } {
  const fallbackScout = "custom-provider/Ornith-1.5-9B-MLX-6bit";
  const fallbackWorker = "custom-provider/gemma-4-26B-A4B-it-qat-uncensored-heretic-mlx-vlm-4Bit";

  const candidatePaths = [
    path.join(cwd, "catalog/components/settings/local_llm.json"),
    path.join(cwd, ".xhs/settings/local_llm.json"),
    path.join(cwd, ".pi/settings/local_llm.json"),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, "utf-8");
        const cfg: LocalLLMConfig = JSON.parse(raw);
        return {
          scoutModel: cfg.fast_model || fallbackScout,
          workerModel: cfg.coding_model || fallbackWorker,
        };
      } catch {
        // Fallback to next candidate
      }
    }
  }

  return { scoutModel: fallbackScout, workerModel: fallbackWorker };
}

/**
 * Project task directive into a bounded (<= 2,000 tokens) context envelope
 * using Universal Context Projector.
 */
function projectContextEnvelope(task: string, cwd: string): string {
  if (!task || task.trim().length === 0) {
    return task;
  }

  const escapedTask = JSON.stringify(task);

  // Strategy 1: Python module CLI
  try {
    const out = execSync(`python3 -m xhs.cli.main context project ${escapedTask} -b 2000`, {
      encoding: "utf-8",
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 8000,
    });
    if (out && out.trim().length > 0) {
      return out.trim();
    }
  } catch {
    // Strategy 2: uv run xhs
    try {
      const out = execSync(`uv run --no-sync xhs context project ${escapedTask} -b 2000`, {
        encoding: "utf-8",
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 10000,
      });
      if (out && out.trim().length > 0) {
        return out.trim();
      }
    } catch {
      // Fallback: return original task
    }
  }

  return task;
}

export default function (pi: ExtensionAPI) {
  // Session startup banner
  pi.on("session_start", async (_event, ctx: ExtensionContext) => {
    if (ctx.hasUI) {
      ctx.ui.setStatus("pi-subagents-loop", "LCGE Clean-Slate Subagents & Context Projector Active");
    }
  });

  // 1. Tool Call Interceptor: Clean-Slate Isolation, Context Projection & Model Routing
  pi.on("tool_call", async (event, ctx: ExtensionContext) => {
    if ((event.toolName === "spawn_agent" || event.toolName === "subagent") && event.input) {
      const input = event.input as Record<string, any>;
      const taskName = String(input.task_name || input.name || "").toLowerCase();
      const agentRole = String(input.agent || input.agent_type || "").toLowerCase();

      // Clean-Slate: Sever parent conversation context inheritance
      const cleanSessionId = `isolated-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      input.session = cleanSessionId;
      input.share_history = false;
      input.fresh = true;

      // Universal Context Subgraph Projection (<= 2,000 tokens)
      const rawTask = String(input.task || input.prompt || input.instruction || "");
      if (rawTask) {
        const projected = projectContextEnvelope(rawTask, ctx.cwd);
        if (input.task) input.task = projected;
        if (input.prompt) input.prompt = projected;
        if (input.instruction) input.instruction = projected;
        if (!input.task && !input.prompt && !input.instruction) {
          input.task = projected;
        }
      }

      // Dynamic SSoT Model & Thinking Routing
      const { scoutModel, workerModel } = resolveSSoTModels(ctx.cwd);

      // Tier 3: Scout / Inspector / Researcher -> Fast Model (thinking: low)
      if (
        taskName.startsWith("scout") ||
        taskName.startsWith("inspector") ||
        taskName.startsWith("research") ||
        agentRole === "scout" ||
        agentRole === "inspector" ||
        agentRole === "researcher"
      ) {
        input.model = scoutModel;
        input.thinking = "low";
        if (ctx.hasUI) {
          ctx.ui.notify(
            `[LCGE Clean-Slate] Injected Scout Model (${scoutModel}, thinking: low) with Bounded Context Subgraph`,
            "info",
          );
        }
      }
      // Tier 2: Worker / Coder / Reviewer -> Coding Model (thinking: high)
      else if (
        taskName.startsWith("worker") ||
        taskName.startsWith("coder") ||
        taskName.startsWith("review") ||
        agentRole === "worker" ||
        agentRole === "coder" ||
        agentRole === "reviewer"
      ) {
        input.model = workerModel;
        input.thinking = "high";
        if (ctx.hasUI) {
          ctx.ui.notify(
            `[LCGE Clean-Slate] Injected Worker Model (${workerModel}, thinking: high) with Bounded Context Subgraph`,
            "info",
          );
        }
      }
      // Fallback: Default to Worker Model to prevent context/VRAM blowout
      else if (!input.model) {
        input.model = workerModel;
        input.thinking = "high";
        if (ctx.hasUI) {
          ctx.ui.notify(
            `[LCGE Clean-Slate] Fallback: Injected Worker Model (${workerModel}) with Bounded Context Subgraph`,
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
        ctx.ui.notify(
          "Worker (Maker) finished. Initiating Gate 2: Independent Checker & Dogfooding Walkthrough...",
          "info",
        );
      }

      try {
        const cmd = "xhs probe check --walkthrough --agent pi";
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
            ctx.ui.notify("✅ [Closed-Loop Gate 2 Approved] Independent Checker & Dogfooding Walkthrough Passed!", "info");
          }
          return;
        }

        // Probe failed (Exit 1): Intercept and inject error feedback (Maker/Checker rejection)
        let feedback = "Maker/Checker Stage 2 verification failed. Please inspect tests and startup commands.";
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
          ctx.ui.notify("⚠️ [Maker/Checker REJECTED] Gate 2 verification failed. Intercepting completion & re-dispatching to Maker...", "warning");
        }

        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `[Maker/Checker Protocol: Gate 2 REJECTED (ADR-0035)]\n${feedback}`,
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

  // 3. Custom command: /verify-loop
  pi.registerCommand("verify-loop", {
    description: "Run objective Done Probe and Dogfooding Walkthrough verification",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Running Objective Done Probe & Dogfooding Walkthrough...", "info");
      try {
        const out = execSync("xhs probe check --walkthrough --agent pi", {
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
