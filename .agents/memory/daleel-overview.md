---
name: Daleel Project Overview
description: Key architectural decisions, conventions, and non-obvious facts about the Daleel contract analysis platform.
---

## Stack
- Frontend: React + Vite at `artifacts/daleel/` (previewPath `/`)
- Backend: Express 5 at `artifacts/api-server/` (port 8080, routes under `/api/`)
- DB: PostgreSQL + Drizzle ORM at `lib/db/`
- AI: Anthropic via Replit AI Integrations proxy — env vars `AI_INTEGRATIONS_ANTHROPIC_API_KEY` + `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`. Falls back to demo data in `artifacts/api-server/src/lib/demoData.ts` when keys are absent.
- Auth: Clerk (provisioned). Server uses `@clerk/express` + `clerkProxyMiddleware`. Frontend uses `@clerk/react` with `publishableKeyFromHost` (never the raw env var). Localization overrides set in `App.tsx` to show Arabic "تسجيل الدخول إلى دليل".
- API codegen: Orval generates `lib/api-client-react/` and `lib/api-zod/` from `lib/api-spec/openapi.yaml`. Run `pnpm --filter @workspace/api-spec run codegen` after spec changes.

## Orval Codegen Constraint
Operations with BOTH a path param AND a query param generate colliding `{Op}Params` types. Fix: move query params to path params. All operations in the current spec are collision-free.

## DB Schema Tables
users, contracts, contract_parties, contract_clauses, contract_financial_details, contract_dates, contract_questions, reminders, activity_logs — all in `lib/db/src/schema/`.

**Why:** Each table is in its own file, re-exported from `lib/db/src/schema/index.ts`. Import everything from `@workspace/db` directly.

## Seed
Run `pnpm --filter @workspace/db run seed` to seed 4 demo contracts (gym, rental, telecom, employment) and 2 demo users:
- user@daleel.app / demo1234
- admin@daleel.app / admin1234

## Auth Middleware (Server-Side)
`artifacts/api-server/src/lib/authMiddleware.ts` — JIT-provisions a local DB user on first Clerk sign-in. All protected routes use `requireAuth`. Admin routes use `requireAdmin`. Cookie-based — no explicit token handling in browser API calls.

## Frontend i18n
`artifacts/daleel/src/lib/i18n.ts` imports `useApp` from `../components/app-provider` (not `./app-provider`). The app-provider is in `src/components/`, not `src/lib/`.

## Lucide Icons
`Scale` is the correct icon for balance/compare (not `Scales` — that doesn't exist). Found in `app-shell.tsx` and `compare-contracts.tsx`.

## Health Route
`/api/healthz` (not `/api/health`).

## AI Model
Uses `claude-sonnet-4-6` for analysis and Q&A, `claude-haiku-4-5` for comparison summary.
