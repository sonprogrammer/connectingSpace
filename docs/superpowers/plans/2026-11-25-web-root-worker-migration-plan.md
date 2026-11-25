# Web Root Worker Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Next.js web app from `apps/web` to the repository root and make the root build a vinext Cloudflare Worker while preserving API and shared validation.

**Architecture:** The root package becomes the web application and remains the pnpm workspace root. Web-only scripts are composed into aggregate validation scripts that continue to run `apps/api` and `packages/shared`.

**Tech Stack:** Next.js, TypeScript, vinext, Vite, Cloudflare Workers, pnpm, Vitest, ESLint

**Spec:** `docs/superpowers/specs/2026-11-25-web-root-worker-migration-design.md`

## Global Constraints

- Preserve `apps/api`, D1 migrations, and `packages/shared`.
- Do not change frontend API contracts or product behavior.
- Do not deploy, delete Cloudflare services, commit, push, or create a PR.
- Default `typecheck`, `lint`, and `test` must cover web, API, and shared.

## Review Focus

- Root scripts must not recurse into themselves through `pnpm --recursive`.
- Worker build must restore Next route types before a later typecheck.
- Root ESLint must not accidentally lint API and shared with the Next.js config.
- Moving `.env.example` must preserve the public API base URL contract.
- Generated Worker, Next, Vite, and TypeScript artifacts must remain ignored.

---

### Task 1: Establish the root-app structure contract

**Files:**

- Move: `apps/web/src/**` → `src/**`
- Move: `apps/web/*config*`, `apps/web/next-env.d.ts`, `apps/web/.env.example` → repository root
- Rename: root web Vitest config to `vitest.web.config.mts` so child workspaces do not inherit it
- Modify: `package.json`, `.gitignore`, `.prettierignore`
- Delete: `apps/web/package.json`, `apps/web/.gitignore`, `apps/web/.prettierignore`

**Interfaces:**

- Consumes: existing `@connecting-space/shared` workspace package
- Produces: root web app and root web dependency importer

- [ ] Run a one-off structure assertion and verify it fails because root `src/app/page.tsx` is absent and `apps/web` exists.
- [ ] Move the web source and configuration files without changing application behavior.
- [ ] Merge web dependencies and web scripts into the root package.
- [ ] Update ignore paths for root-generated artifacts.
- [ ] Run the structure assertion and verify it passes.

### Task 2: Switch the root build from Pages export to Worker

**Files:**

- Modify: `next.config.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: root vinext and Cloudflare configuration
- Produces: `pnpm build` Worker output and no `out` export contract

- [ ] Run a configuration assertion and verify it fails while `output: 'export'` and the old build contract exist.
- [ ] Remove static export and export-only image configuration.
- [ ] Make root `build` run web type generation, TypeScript, Vite Worker build, and Next type restoration.
- [ ] Run the configuration assertion and verify it passes.

### Task 3: Preserve aggregate validation and update active paths

**Files:**

- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`
- Modify: `.agents/skills/frontend/SKILL.md`
- Create: `apps/api/vitest.config.mts` to keep API tests from inheriting the root web Vite config
- Create: `packages/shared/vitest.config.mts` to keep shared tests from inheriting the root web Vite config

**Interfaces:**

- Consumes: root web validation scripts and existing API/shared scripts
- Produces: aggregate root checks and current developer instructions

- [ ] Run a script assertion and verify aggregate validation scripts are absent.
- [ ] Add web-only scripts and compose default typecheck, lint, and test across web, API, and shared.
- [ ] Update CI to execute root formatting, lint, typecheck, test, and Worker build.
- [ ] Document root web commands and update the Frontend path boundary.
- [ ] Run the script assertion and verify all three packages are included.

### Task 4: Verify the migrated application

**Files:**

- Verify only

**Interfaces:**

- Consumes: completed root app structure and scripts
- Produces: evidence for #47 reporting

- [ ] Run `pnpm install` to update the lockfile importer.
- [ ] Run root `typecheck`, `lint`, `test`, `format:check`, and `build`.
- [ ] Run `git diff --check`.
- [ ] Start the local Worker, verify `/` returns HTTP 200 and expected public copy, then stop it.
- [ ] Report changed files, command results, and remaining Backend migration work without committing.
