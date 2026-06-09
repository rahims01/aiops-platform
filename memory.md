# Memory — persistent session context

## Project decisions
- Using Next.js 16 App Router with React 19, TypeScript, Tailwind CSS v4
- Path alias `@/*` maps to `./src/*`
- All types in `src/lib/types.ts` — extend these, don't duplicate
- All mock data in `src/lib/mock-data.ts` — import types from `./types`
- Client components use `'use client'` directive
- Navigation uses `usePathname()` from `next/navigation` for active state
- Icons from `lucide-react` (tree-shake imports)
- Class merging via `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge)
- Status colors via `getStatusColor()`, `getSeverityColor()`, `getRiskColor()` from utils
- Dark mode via `dark:` variants; globals.css uses CSS variables

## Conventions
- ESLint extends `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- Strict TS: `strict: true`, `noEmit: true`, `isolatedModules: true`
- All commands run inside Docker containers (not on the host)
- Run `docker compose -f docker-compose.local.yml run --rm app npm run lint` before committing
- No test framework configured yet
- Environment variables: `.env*` ignored (add `.env.example` if needed)

## Gotchas
- Next.js 16 has breaking changes — check `node_modules/next/dist/docs/` for current APIs
- Cert expiry days in mock data drive failure predictions — update together
- Axway ST API rate limits: throttle at >60 req/min, batch queries in pages of 100
- OAuth2 tokens expire — implement automatic refresh with retry logic

## Commands & shortcuts (all via Docker)
```bash
docker compose -f docker-compose.local.yml up --build                       # Start dev server (localhost:3000, HMR)
docker compose -f docker-compose.local.yml down                             # Stop dev server
docker compose -f docker-compose.local.yml run --rm app npm run build       # Production build (output: standalone)
docker compose -f docker-compose.local.yml run --rm app npm run lint        # ESLint
docker compose -f docker-compose.local.yml run --rm app npx tsc --noEmit    # Type-check only
docker compose -f docker-compose.prod.yml up --build -d   # Production server
```

## Architecture notes
- **App Router** in `src/app/` — pages, layouts, globals.css
- **Components** in `src/components/` — client components (Sidebar, etc.)
- **Lib** in `src/lib/` — utilities, types, mock data

## Navigation structure (from Sidebar)
- `/` — Health Overview (Dashboard)
- `/incidents` — Incident Timeline
- `/ml-insights` — ML Insights
- `/sla-trends` — SLA & Trends

## Mock data available
- `mockTransfers` — TransferEvent[]
- `mockIncidents` — CorrelatedIncident[]
- `mockNodeHealth` — NodeHealth[]
- `mockAnomalyScores` — AnomalyScore[]
- `mockFailurePredictions` — FailurePrediction[]
- `mockBaselineData` — BaselineData[]
- `mockRootCauses` — RootCauseCandidate[]
- `mockAlerts` — Alert[]
- `mockMetricCards` — MetricCard[]
- `mockErrorCodes` — ErrorCodeDistribution[]
- `mockAccountHealth` — AccountHealth[]
- `mockMTTRData` — { week, mttr_minutes }[]
- `mockVolumeTrend` — { date, volume }[]