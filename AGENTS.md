# AGENTS.md — okojomoeko.github.io Guidelines

## 🚀 Repository Context

This repository contains the personal portfolio website of **okojomoeko**, deployed to GitHub Pages at `https://okojomoeko.github.io`.

- **Framework**: Astro 7.x
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`), DaisyUI 5 (`daisyui`), Typography (`@tailwindcss/typography`)
- **Icons**: `astro-icon` v1.x with `@iconify-json/mdi`
- **Testing**: Playwright (`@playwright/test`)
- **Tooling & Package Manager**: `mise` (`node 26.x`, `pnpm 10.x`, `lefthook`)
- **Deployment**: GitHub Pages via GitHub Actions

---

## 🛠 Standard Commands

All commands are managed through `mise` and `pnpm`:

| Task                  | Command                                  | Description                                         |
| :-------------------- | :--------------------------------------- | :-------------------------------------------------- |
| **Dev Server**        | `mise run dev` (or `pnpm dev`)           | Starts local development server on port 4321        |
| **Build**             | `mise run build` (or `pnpm build`)       | Compiles production static assets to `dist/`        |
| **Type Check**        | `mise run check` (or `pnpm check`)       | Runs `@astrojs/check` across all Astro and TS files |
| **Lint / Format**     | `mise run lint` / `mise run format`      | Checks and formats with Prettier                    |
| **E2E Tests**         | `mise run test:e2e` (or `pnpm test:e2e`) | Runs Playwright tests and visual assertions         |
| **Update Snapshots**  | `mise run test:e2e:update`               | Updates Playwright visual snapshots                 |
| **Security Audit**    | `mise run audit`                         | Runs `pnpm audit --audit-level=high`                |
| **Full Verification** | `mise run verify`                        | Runs check, lint, build, test:e2e, and audit        |
| **Maintenance**       | `bash scripts/maintenance.sh update`     | Automated dependency bump and full regression test  |

---

## 📐 Coding & Architecture Standards

1. **Astro Components**:
   - Explicitly type component props using `export interface Props { ... }`.
   - Use `import { Icon } from "astro-icon/components"` for icons.
   - For markdown files in pages, use `import.meta.glob<MarkdownInstance>` (never deprecated `Astro.glob`).
   - For API routes / RSS, use uppercase HTTP method exports (`export async function GET(context)`).

2. **Styling with Tailwind v4 & DaisyUI 5**:
   - `src/styles/global.css` is the single source of truth for styles:
     ```css
     @import "tailwindcss";
     @plugin "@tailwindcss/typography";
     @plugin "daisyui";
     ```
   - Do NOT create `tailwind.config.cjs` (Tailwind v4 uses CSS-first configuration and `@tailwindcss/vite`).

3. **Pre-commit & Pre-push Discipline**:
   - Lefthook hooks are installed automatically on `pnpm install`.
   - Never bypass quality checks. Run `pnpm run verify` before pushing.
