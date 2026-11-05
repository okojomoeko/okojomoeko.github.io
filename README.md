# okojomoeko.github.io

okojomoeko's personal portfolio website, built with [Astro](https://astro.build/) and deployed to [GitHub Pages](https://okojomoeko.github.io).

## 🚀 Tech Stack

- **Framework**: [Astro 7](https://astro.build)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) + [DaisyUI 5](https://daisyui.com) + [Typography](https://tailwindcss.com/docs/typography-plugin)
- **Icons**: [Astro Icon](https://github.com/natemoo-re/astro-icon) (`@iconify-json/mdi`)
- **Package Manager**: [pnpm](https://pnpm.io/) managed with [mise](https://mise.jdx.dev/)
- **Testing**: [Playwright](https://playwright.dev/) E2E & visual regression tests
- **Type Checking**: `@astrojs/check` + TypeScript
- **Formatting**: [Prettier](https://prettier.io/) with `prettier-plugin-astro`
- **Git Hooks**: [Lefthook](https://github.com/evilmartians/lefthook)
- **CI/CD & Automation**: GitHub Actions (Pages deployment, CI quality gate, security audit, Dependabot auto-merge)

## 📦 Getting Started

### Prerequisites

- [mise](https://mise.jdx.dev/) (recommended) or Node.js `>=22.23.4` and `pnpm >=10`

### Installation

```bash
# Install dependencies
mise exec -- pnpm install
# or directly with pnpm:
pnpm install
```

### Development

```bash
# Start local dev server (http://localhost:4321)
pnpm dev
# or
mise run dev
```

### Build & Preview

```bash
# Production build
pnpm build

# Preview production build locally
pnpm preview
```

### Verification & Testing

```bash
# Astro & TypeScript type check
pnpm check

# Code formatting check
pnpm lint

# E2E and visual regression tests
pnpm test:e2e

# Full quality gate verification
pnpm run verify
```

## 🔄 Automated Maintenance & Security

This repository is configured for autonomous, hands-off maintenance:

- **Weekly Automated Dependency Upgrades**: Managed via Dependabot with grouping (`production-dependencies`, `dev-dependencies`, `github-actions`) and Renovate configuration targeting `main`.
- **Dependabot Auto-Merge**: Safe patch/minor updates that pass all CI checks are merged automatically.
- **Continuous Security Audits**: Weekly vulnerability checks via `pnpm audit` and secret leakage detection via `gitleaks-action`.
- **Maintenance Script**: Run `bash scripts/maintenance.sh update` to bump all packages and run the full verification pipeline locally.
- **Agent Skill**: Available in `.agents/skills/portfolio-maintenance/SKILL.md` for AI agent pair-programming and automated updates.

## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.
