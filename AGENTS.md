# AIOps Platform — Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4

Monitors Axway SecureTransport file transfers with ML-powered anomaly detection, failure prediction, and incident correlation.

## Key Commands

**All commands run inside Docker.** The `app` service (Dockerfile.dev) mounts the source as a volume, so one-off commands run against your live code via `docker compose run --rm`.

```bash
docker compose up --build                       # Start dev server (localhost:3000, Turbopack, HMR)
docker compose down                             # Stop dev server
docker compose run --rm app npm run lint        # ESLint (next/core-web-vitals + next/typescript)
docker compose run --rm app npx tsc --noEmit    # Type-check only (no build)
docker compose run --rm -e NODE_ENV=production app npm run build   # Production build (output: standalone)
docker compose run --rm app npm run docs        # Regenerate HTML docs in docs/ from the .md files

docker compose -f docker-compose.prod.yml up --build -d   # Production server (standalone)
```

> Underlying npm scripts (`dev`, `build`, `start`, `lint`) still live in package.json — Docker just wraps them. Avoid running them on the host; use the container so Node/deps match.

## Architecture

- **App Router** in `src/app/` — pages, layouts, globals.css
- **Components** in `src/components/` — client components (Sidebar, etc.)
- **Lib** in `src/lib/` — utilities, types, mock data
- **Path alias**: `@/*` → `./src/*` (tsconfig.json)

## Type System (`src/lib/types.ts`)

Core domain types — **extend these, don't duplicate**:
- `TransferEvent` — SecureTransport file transfer records
- `CorrelatedIncident` — ServiceNow incidents linked to transfers
- `NodeHealth` — Cluster node metrics (CPU, memory, disk, queue, cert expiry)
- `AnomalyScore` — ML anomaly detection results
- `FailurePrediction` — XGBoost failure probability + risk factors
- `RootCauseCandidate` — Ranked RCA hypotheses with evidence
- `Alert` — Unified alerts from ML, Axway, ServiceNow, runbooks
- `MetricCard`, `ErrorCodeDistribution`, `AccountHealth` — Dashboard types

## Mock Data (`src/lib/mock-data.ts`)

All development data lives here. Import types from `./types`. Add new mock data here, not in components.
- Cert expiry days in mock data drive failure predictions — update together

## Styling Conventions

- **Tailwind v4** via `@tailwindcss/postcss` (postcss.config.mjs) — no tailwind.config.ts
- **Class merging**: `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge)
- **Status colors**: Use `getStatusColor()`, `getSeverityColor()`, `getRiskColor()` from utils
- **Dark mode**: `dark:` variants throughout; globals.css uses CSS variables

## Component Patterns

- Client components: `'use client'` directive at top
- Navigation: `usePathname()` from `next/navigation` for active state
- Icons: `lucide-react` (tree-shake imports)
- New pages: create `src/app/<route>/page.tsx`, add to `Sidebar.tsx`

## ESLint / TypeScript

- Extends `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- Strict TS: `strict: true`, `noEmit: true`, `isolatedModules: true`
- Run `docker compose run --rm app npm run lint` before committing

## Docker

- **All commands run in Docker** — see Key Commands. Don't run `npm`/`npx` on the host.
- **Dev**: `docker-compose.yml` uses `Dockerfile.dev` with volume mounts; one-off commands via `docker compose run --rm app <cmd>`
- **Prod**: Multi-stage `Dockerfile` builds standalone output (`next.config.ts: output: 'standalone'`), orchestrated by `docker-compose.prod.yml`
- Env: `NODE_ENV=production`, `NEXT_TELEMETRY_DISABLED=1`

## Environment

- Create `.env.local` for local dev (git-ignored): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`
- `.env*` ignored by git — add `.env.example` if needed

## Gotchas

- **Next.js 16 has breaking changes** — check `node_modules/next/dist/docs/` for current APIs
- No test framework configured yet
- Port 3000 in use: `lsof -ti:3000 | xargs kill -9`, or change the host port mapping in `docker-compose.yml` (e.g. `"3001:3000"`)
- Type errors after adding types: run `docker compose run --rm app npx tsc --noEmit`
- `next build` fails on `/_global-error` (`useContext` null): the dev `app` service sets `NODE_ENV=development` — build with `-e NODE_ENV=production` or use `docker-compose.prod.yml`
- Docker build fails on `npm ci`: ensure `package-lock.json` is committed
- Tailwind styles not applying: verify `@import "tailwindcss";` in globals.css, restart the container (`docker compose restart app`)
- Code changes not reflected in container: ensure volume mounts are intact; rebuild with `docker compose up --build`
- After changing `package.json`: rebuild the image (`docker compose build app`) so deps reinstall in the container
- Axway ST API rate limits: throttle at >60 req/min, batch queries in pages of 100
- OAuth2 tokens expire — implement automatic refresh with retry logic