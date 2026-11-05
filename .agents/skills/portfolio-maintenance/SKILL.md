---
name: portfolio-maintenance
description: Automated maintenance, technology stack upgrades, security auditing, and visual test snapshot verification for okojomoeko.github.io. Use whenever checking for outdated dependencies, upgrading Astro/Tailwind/DaisyUI, fixing breaking changes, verifying visual regressions with Playwright, or resolving security vulnerabilities.
---

# Portfolio Maintenance Skill (okojomoeko.github.io)

This skill provides deterministic, automated procedures for maintaining, updating, and securing `okojomoeko.github.io`.

---

## 🛠 Tech Stack Architecture

- **Static Site Generator**: Astro 7.x (`astro`)
- **Package Manager**: pnpm 10.x (`mise` managed)
- **Runtime**: Node.js 26.x / 22+ LTS (`mise` managed)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`), DaisyUI 5 (`daisyui`), Typography (`@tailwindcss/typography`)
- **Iconography**: `astro-icon` v1.x with `@iconify-json/mdi`
- **Testing**: Playwright (`@playwright/test`) with visual regression snapshots
- **Type Checking**: `@astrojs/check` + TypeScript (`pnpm check`)
- **Formatting**: Prettier (`prettier-plugin-astro`)
- **Git Hooks**: Lefthook (`lefthook.yml`)

---

## 🚀 Standard Maintenance Operating Procedures

### 1. Periodic Dependency Upgrade Routine

Run the automated maintenance updater:

```bash
# Check available updates
mise run update:check

# Or execute full upgrade and verification pipeline
mise run update:apply
```

If applying manually:

1. Check outdated: `ncu`
2. Bump `package.json`: `ncu -u`
3. Install: `pnpm install`
4. Type check: `pnpm check`
5. Format: `pnpm format`
6. Build: `pnpm build`
7. E2E test & update snapshots: `pnpm test:e2e:update`
8. Security audit: `pnpm audit --audit-level=high`

### 2. Security Vulnerability Remediation

When `pnpm audit` reports vulnerabilities:

1. Inspect the advisory: `pnpm audit`
2. If a transitive dependency has a patch, enforce the resolution in `package.json` under `pnpm.overrides`:
   ```json
   "pnpm": {
     "overrides": {
       "vulnerable-package": ">=patched.version"
     }
   }
   ```
3. Run `pnpm install` and verify `pnpm audit` returns 0 vulnerabilities.

### 3. Visual Regression & Snapshot Updates

When updating UI libraries (DaisyUI, Tailwind) or font packages:

1. Run Playwright E2E: `pnpm test:e2e`
2. If rendering changed legitimately:
   ```bash
   pnpm test:e2e:update
   ```
3. Review `git diff` for updated snapshots in `tests/index.spec.ts-snapshots/` to verify intentional visual improvements.

### 4. Full Quality Gate Verification

Before committing or pushing any change, execute:

```bash
pnpm run verify
```

This runs:

- `pnpm check` (zero TypeScript and Astro template errors)
- `pnpm lint` (Prettier code style check)
- `pnpm build` (production static site build into `dist/`)
- `pnpm test:e2e` (Playwright E2E and visual regression test suite)
- `pnpm audit --audit-level=high` (zero high/critical security issues)

---

## 🔒 Automated CI/CD Safeguards

- **`ci.yml`**: Runs type checking, formatting, build, security audit, and Playwright E2E tests on every PR and push to `main`.
- **`deploy.yml`**: Deploys `dist/` to GitHub Pages via official `actions/deploy-pages@v4`.
- **`security.yml`**: Runs scheduled weekly vulnerability audits and Gitleaks secret scans.
- **`auto-merge.yml`**: Automatically approves and auto-merges Dependabot PRs when all CI checks pass.
