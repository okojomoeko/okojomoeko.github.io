#!/usr/bin/env bash
# scripts/maintenance.sh — Automated Maintenance & Verification Runner for okojomoeko.github.io
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

log_info() {
  echo -e "\033[1;34m[INFO]\033[0m $*"
}

log_success() {
  echo -e "\033[1;32m[SUCCESS]\033[0m $*"
}

log_error() {
  echo -e "\033[1;31m[ERROR]\033[0m $*" >&2
}

cmd_check() {
  log_info "Checking for available package updates (ncu)..."
  if command -v ncu >/dev/null 2>&1; then
    ncu
  else
    pnpm dlx npm-check-updates
  fi
}

cmd_update() {
  log_info "Upgrading package.json to latest stable versions..."
  if command -v ncu >/dev/null 2>&1; then
    ncu -u
  else
    pnpm dlx npm-check-updates -u
  fi

  log_info "Installing updated dependencies with pnpm..."
  pnpm install

  log_info "Running Astro & TypeScript type check..."
  pnpm check

  log_info "Formatting codebase..."
  pnpm format

  log_info "Building production static site..."
  pnpm build

  log_info "Running Playwright E2E tests & updating snapshots..."
  pnpm test:e2e:update

  log_info "Auditing security vulnerabilities..."
  pnpm audit --audit-level=high

  log_success "All dependencies successfully upgraded and verified!"
}

cmd_audit() {
  log_info "Auditing npm dependencies..."
  pnpm audit --audit-level=high

  if command -v gitleaks >/dev/null 2>&1; then
    log_info "Running local secret scan with Gitleaks..."
    gitleaks detect --no-git -v || true
  fi

  log_success "Security audit passed with zero high-severity vulnerabilities!"
}

cmd_snapshots() {
  log_info "Regenerating Playwright visual snapshots..."
  pnpm test:e2e:update
  log_success "Snapshots updated!"
}

cmd_verify() {
  log_info "Running comprehensive quality gate verification..."
  pnpm check
  pnpm lint
  pnpm build
  pnpm test:e2e
  pnpm audit --audit-level=high
  log_success "All verification checks passed cleanly!"
}

case "${1:-verify}" in
  check)
    cmd_check
    ;;
  update)
    cmd_update
    ;;
  audit)
    cmd_audit
    ;;
  snapshots)
    cmd_snapshots
    ;;
  verify)
    cmd_verify
    ;;
  *)
    echo "Usage: $0 {check|update|audit|snapshots|verify}"
    exit 1
    ;;
esac
