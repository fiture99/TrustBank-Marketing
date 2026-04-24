# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Trust Bank Marketing & Sales Suite

A web app at `artifacts/trust-bank` providing three integrated systems for Trust Bank (Gambia):
1. **Marketing Campaign Dashboard** — KPIs, monthly trend, channel mix, funnel, revenue overview, channel performance table.
2. **Activity Tracker** — campaigns CRUD, leads with interaction timeline, sales pipeline kanban (drag-and-drop), follow-ups, team activity.
3. **Notification System** — bulk SMS/email/in-app sending with audience selection, templates, send history, personal inbox.

Currency is Gambian Dalasi (D). Demo includes a profile switcher (no real auth) with three roles: marketing, sales, manager. Backend lives in `artifacts/api-server` with route handlers in `src/routes/`. Schema is in `packages/db/src/schema.ts`. Seed via `cd artifacts/api-server && pnpm exec esbuild src/seed.ts --bundle --platform=node --format=esm --outfile=dist/seed.mjs --packages=external && node dist/seed.mjs`.
