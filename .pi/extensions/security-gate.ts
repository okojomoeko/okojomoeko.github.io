/**
 * Pi Coding Agent Extension: Deterministic Security Gate & Sandbox Guard
 *
 * Enforces hard isolation boundaries for local models (including abliterated / uncensored weights):
 * 1. Blocks destructive bash operations (rm -rf, sudo, chmod 777, raw block devices, curl-to-shell piping).
 * 2. Enforces read/write protection over sensitive credentials (.env, ~/.ssh, ~/.aws, private keys).
 * 3. Prevents self-tampering with harness configuration (~/.pi, ~/.gemini, ~/.codex, ~/.claude).
 * 4. Deterministic non-interactive blocking in headless / automated loops.
 *
 * Follows XHS Security Policy Invariants & ADR-0028.
 */

import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // Destructive bash command patterns
  const DANGEROUS_COMMAND_PATTERNS = [
    /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f?|--recursive)\b/i,
    /\bsudo\b/i,
    /\b(chmod|chown)\b.*777/i,
    /\bmkfs(\.[a-z0-9]+)?\b/i,
    /\bdd\s+if=/i,
    /\bgit\s+filter-(branch|repo)\b/i,
    /\b(curl|wget)\b.*\|\s*(bash|sh|zsh)\b/i,
    /\b:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, // Fork bomb
  ];

  // Protected files/directories from write or edit operations
  const WRITE_PROTECTED_PATTERNS = [
    /\.env(\..+)?$/i,
    /\.git($|\/)/i,
    /node_modules($|\/)/i,
    /(\.|\/)(id_rsa|id_ed25519|id_ecdsa)(\.pub)?$/i,
    /\.(pem|key|pkcs12|pfx)$/i,
    /(\.ssh|\.aws|\.gnupg|\.docker|\.kube)($|\/)/i,
    /(\.pi|\.gemini|\.codex|\.claude)($|\/)/i,
  ];

  // Protected paths strictly forbidden from reading (credential theft prevention)
  const READ_PROTECTED_PATTERNS = [
    /\.env(\..+)?$/i,
    /(\.|\/)(id_rsa|id_ed25519|id_ecdsa)$/i,
    /\.(pem|key|pkcs12|pfx)$/i,
    /\/\.ssh\/(id_|config|known_hosts)/i,
    /\/\.aws\/(credentials|config)/i,
    /\/\.gnupg\//i,
    /\.git-credentials$/i,
    /\.npmrc$/i,
  ];

  pi.on("tool_call", async (event, ctx: ExtensionContext) => {
    const toolName = event.toolName;
    const input = (event.input || {}) as Record<string, any>;

    // 1. Bash Tool Validation
    if (toolName === "bash") {
      const command = String(input.command || "").trim();
      const isDangerous = DANGEROUS_COMMAND_PATTERNS.some((p) => p.test(command));

      if (isDangerous) {
        if (!ctx.hasUI) {
          // In headless, background, or automated subagent mode: fail-safe immediate rejection
          return {
            block: true,
            reason: `[XHS Security Gate] Destructive bash command blocked: "${command}"`,
            terminate: true,
          };
        }

        // Interactive mode: Prompt user explicitly
        const choice = await ctx.ui.select(
          `⚠️ [XHS Security Alert] Potentially destructive command detected:\n\n  ${command}\n\nExecute anyway?`,
          ["No (Block)", "Yes (Allow)"]
        );

        if (choice !== "Yes (Allow)") {
          return {
            block: true,
            reason: `[XHS Security Gate] Blocked by user approval gate: "${command}"`,
          };
        }
      }
      return undefined;
    }

    // 2. Write / Edit Operations
    if (toolName === "write" || toolName === "edit") {
      const filePath = String(input.path || "");
      const isWriteProtected = WRITE_PROTECTED_PATTERNS.some((p) => p.test(filePath));

      if (isWriteProtected) {
        if (ctx.hasUI) {
          ctx.ui.notify(`[XHS Security Gate] Blocked write to protected target: ${filePath}`, "error");
        }
        return {
          block: true,
          reason: `[XHS Security Gate] Path "${filePath}" is write-protected by security policy.`,
        };
      }
      return undefined;
    }

    // 3. Sensitive Read Operations
    if (toolName === "read") {
      const filePath = String(input.path || "");
      const isReadProtected = READ_PROTECTED_PATTERNS.some((p) => p.test(filePath));

      if (isReadProtected) {
        if (ctx.hasUI) {
          ctx.ui.notify(`[XHS Security Gate] Blocked read of credential file: ${filePath}`, "warning");
        }
        return {
          block: true,
          reason: `[XHS Security Gate] Access to credential file "${filePath}" is denied.`,
        };
      }
      return undefined;
    }

    return undefined;
  });
}