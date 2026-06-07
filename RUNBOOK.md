# AIOps Platform — Runbook

Complete guide to running the Axway SecureTransport AIOps Platform locally and in production.

---

## Quick Start

> **Everything runs in Docker.** You don't need Node.js or npm on your host — only Docker + Docker Compose. Dependencies install inside the container.

```bash
# 1. Clone and navigate
cd aiops-platform

# 2. Build the image and start the dev server
docker compose up --build

# 3. Open http://localhost:3000
```

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Docker | 24.x+ | The only hard requirement — runs everything |
| Docker Compose | 2.x+ | For dev orchestration (`docker compose` v2 syntax) |
| Node.js | 20.x LTS | Optional — only if you want to run outside Docker |
| npm | 10.x | Optional — bundled with Node.js |

Verify:
```bash
docker --version          # 24.x.x
docker compose version    # v2.x.x
```

---

## Development Mode

### Docker Compose (default)

All development happens in the `app` container (built from `Dockerfile.dev`). The project source is volume-mounted, so edits on the host are picked up live.

```bash
docker compose up --build    # Build image + start Next.js dev server (Turbopack)
```

**Access:** http://localhost:3000

**Features:**
- Hot module replacement (HMR) via volume mounts
- `node_modules` and `.next` cache held in named volumes (host edits don't clobber them)
- Mock data from `src/lib/mock-data.ts`
- Environment: `NODE_ENV=development`, `NEXT_TELEMETRY_DISABLED=1`

Stop:
```bash
docker compose down
```

### One-off commands in the container

Run lint, type-check, or any tooling inside the same image without a host Node install. `--rm` removes the throwaway container when done:

```bash
docker compose run --rm app npm run lint         # ESLint
docker compose run --rm app npx tsc --noEmit     # Type-check only
docker compose run --rm app npm run build        # Production build
docker compose run --rm app sh                   # Interactive shell in the container
```

If the dev server is already running, you can also exec into it:

```bash
docker compose exec app npm run lint
```

---

## Production Build

### Docker Compose (recommended)

```bash
docker compose -f docker-compose.prod.yml up --build -d   # Build + run standalone server (detached)
docker compose -f docker-compose.prod.yml down            # Stop
docker compose -f docker-compose.prod.yml logs -f app     # Tail logs
```

This builds the multi-stage `Dockerfile` (standalone output) and includes a health check on port 3000.

### Manual build & run (produces the standalone output)

The `app` (dev) service sets `NODE_ENV=development`, but `next build` **must** run with `NODE_ENV=production` — otherwise prerendering fails (e.g. `/_global-error: Cannot read properties of null (reading 'useContext')`). Override it:

```bash
docker compose run --rm -e NODE_ENV=production app npm run build   # Standalone output in .next/standalone
```

> For a real production run, prefer `docker compose -f docker-compose.prod.yml up --build` — its multi-stage `Dockerfile` builds with the correct env automatically.

**Output structure:**
```
.next/
├── standalone/
│   ├── server.js          # Entry point
│   ├── package.json       # Minimal deps
│   └── node_modules/      # Production deps only
├── static/                # Static assets (hashed)
└── public/                # Public folder contents
```

### Docker Production

```bash
# Build image
docker build -t aiops-platform:latest .

# Run container
docker run -d \
  --name aiops-platform \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEXT_TELEMETRY_DISABLED=1 \
  aiops-platform:latest
```

**Access:** http://localhost:3000

**Image details:**
- Base: `node:20-alpine`
- Multi-stage build (deps → builder → runner)
- Non-root user (`nextjs:nodejs`, uid:gid 1001)
- Standalone output for minimal size (~150MB)
- Health check via `server.js` on port 3000

---

## Environment Variables

Create `.env.local` for local development (git-ignored):

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001
# Add any API keys or secrets here
```

**Production:** Set via container orchestration (K8s secrets, Docker Swarm configs, etc.)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `development` or `production` |
| `NEXT_TELEMETRY_DISABLED` | Recommended | `1` to disable Next.js telemetry |
| `PORT` | No | Server port (default: 3000) |
| `HOSTNAME` | No | Bind address (default: `0.0.0.0`) |

---

## Project Structure

```
aiops-platform/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── globals.css         # Tailwind v4 + CSS variables
│   │   ├── layout.tsx          # Root layout (fonts, providers)
│   │   └── page.tsx            # Home page (Health Overview)
│   ├── components/             # Client components
│   │   └── Sidebar.tsx         # Navigation sidebar
│   └── lib/                    # Shared utilities
│       ├── types.ts            # Core domain types
│       ├── mock-data.ts        # All dev mock data
│       └── utils.ts            # cn(), formatters, color helpers
├── public/                     # Static assets
├── .next/                      # Build output (git-ignored)
├── node_modules/               # Dependencies (git-ignored)
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
├── postcss.config.mjs
├── Dockerfile                  # Production multi-stage
├── Dockerfile.dev              # Development
├── docker-compose.yml          # Dev orchestration
├── docker-compose.prod.yml     # Prod orchestration (if exists)
├── .gitignore
├── .dockerignore
├── README.md
├── AGENTS.md                   # Agent instructions
├── CLAUDE.md                   # Points to AGENTS.md
└── RUNBOOK.md                  # This file
```

---

## Key Commands Reference

All commands run through Docker. The underlying npm scripts live in `package.json`; Docker just wraps them so Node and dependencies match across machines.

| Command | Description |
|---------|-------------|
| `docker compose up --build` | Start dev server (Turbopack, HMR) |
| `docker compose down` | Stop dev server |
| `docker compose run --rm -e NODE_ENV=production app npm run build` | Production build (standalone output) |
| `docker compose run --rm app npm run lint` | Run ESLint (core-web-vitals + typescript) |
| `docker compose run --rm app npx tsc --noEmit` | Type-check only (no build) |
| `docker compose run --rm app npm run docs` | Regenerate HTML docs in `docs/` from the `.md` files |
| `docker compose run --rm app sh` | Open a shell in the container |
| `docker compose exec app <cmd>` | Run `<cmd>` in the already-running dev container |
| `docker compose -f docker-compose.prod.yml up --build -d` | Build + run production server |

---

## Documentation (HTML)

Every Markdown doc in the repo root has a browsable HTML rendering under `docs/`, produced by `scripts/build-docs.mjs` (uses `marked`). Open `docs/index.html` in a browser for the landing page.

Regenerate after editing any `.md` (runs inside the container, like everything else):

```bash
docker compose run --rm app npm run docs
```

- Output: `docs/<name>.html` + `docs/index.html`
- Intra-doc links (`foo.md`) are rewritten to `foo.html` so the set is browsable offline
- The generator picks up **all** root-level `.md` files automatically — no per-file config

---

## Tailwind CSS v4 Setup

This project uses **Tailwind CSS v4** (not v3) via PostCSS plugin:

```js
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

```css
/* src/app/globals.css */
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}
```

**No `tailwind.config.ts` needed** — v4 uses CSS-first configuration.

---

## TypeScript Configuration

```json
// tsconfig.json highlights
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "moduleResolution": "bundler",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

- **Path alias**: `@/lib/utils` → `src/lib/utils.ts`
- **No emit**: Next.js handles compilation
- **Strict mode**: All strict checks enabled

---

## ESLint Configuration

```js
// eslint.config.mjs
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default [
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"])
];
```

Run: `docker compose run --rm app npm run lint`

---

## Adding New Pages

1. Create `src/app/<route>/page.tsx`
2. Add to `Sidebar.tsx` navigation array
3. Use `'use client'` for interactive components
4. Import types from `@/lib/types`
5. Use mock data from `@/lib/mock-data`

Example:
```tsx
// src/app/ml-insights/page.tsx
'use client';

import { mockAnomalyScores, mockFailurePredictions } from '@/lib/mock-data';
import { cn, getSeverityColor } from '@/lib/utils';

export default function MLInsightsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">ML Insights</h1>
      {/* ... */}
    </div>
  );
}
```

---

## Mock Data Management

All development data lives in `src/lib/mock-data.ts`:

- **Types imported from** `./types`
- **Single source of truth** for all components
- **Update here** when adding new data shapes
- **Cert expiry days** drive failure predictions — keep in sync

```typescript
// Import pattern
import { TransferEvent, NodeHealth } from './types';
export const mockTransfers: TransferEvent[] = [...];
export const mockNodeHealth: NodeHealth[] = [...];
```

---

## Common Issues & Fixes

### Port 3000 already in use
```bash
# Find and kill the host process holding the port
lsof -ti:3000 | xargs kill -9

# Or remap the host port in docker-compose.yml, e.g.:
#   ports:
#     - "3001:3000"
```

### Type errors after adding types
```bash
# Restart TS server in editor (VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server")
# Or type-check in the container
docker compose run --rm app npx tsc --noEmit
```

### Build fails on `/_global-error` with "Cannot read properties of null (reading 'useContext')"
The dev `app` service sets `NODE_ENV=development`, which breaks `next build`. Build with production env:
```bash
docker compose run --rm -e NODE_ENV=production app npm run build
# or use the prod stack, which sets it correctly:
docker compose -f docker-compose.prod.yml up --build
```

### Docker build fails on `npm ci`
```bash
# Ensure package-lock.json is committed
git add package-lock.json
git commit -m "chore: update lockfile"
```

### Dependencies changed but container is stale
```bash
# Rebuild the image so npm ci reruns inside the container
docker compose build app
docker compose up
```

### Code changes not reflected in the container
- Confirm the volume mounts in `docker-compose.yml` are intact (`.:/app`)
- Restart: `docker compose restart app`, or rebuild: `docker compose up --build`

### Tailwind styles not applying
- Ensure `@import "tailwindcss";` is in `globals.css`
- Check `postcss.config.mjs` has `@tailwindcss/postcss`
- Restart the container: `docker compose restart app`

### Next.js 16 breaking changes
- Check `node_modules/next/dist/docs/` for current APIs
- App Router patterns differ from Pages Router
- `next/font` usage updated (see `layout.tsx`)

---

## Deployment Checklist

- [ ] `docker compose run --rm app npm run lint` passes
- [ ] `docker compose run --rm app npx tsc --noEmit` passes
- [ ] Production image builds & runs: `docker compose -f docker-compose.prod.yml up --build`
- [ ] Health check passes (compose `healthcheck` reports `healthy`)
- [ ] Environment variables configured for target env
- [ ] Environment variables configured for target env
- [ ] Secrets managed (not in image)

---

## Useful Links

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [React 19](https://react.dev)
- [Axway SecureTransport API](https://docs.axway.com/bundle/securetransport/)
- [ServiceNow REST API](https://developer.servicenow.com/dev.do#!/reference/api)

---

*Generated for AIOps Platform v0.1.0*