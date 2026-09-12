# Hand-off: Apply Shipora Surgical Fixes to Owed

**Decompose session**: `2026-09-12-shipora-deploy-fixes`  
**Repo**: `/Users/binova/Documents/Projects/Suru/Owed`  
**Shipora engine reference**: `/Users/binova/Documents/Projects/Suru/EazyDeploy`

---

## Verified Facts (Do Not Re-Investigate)

All claims below are proven from source code — no assumptions.

---

## Changes to Apply

### FIX 1 — `next.config.ts`: Add `output: "standalone"` [CRITICAL]
**File**: `/Users/binova/Documents/Projects/Suru/Owed/next.config.ts`
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```
**Why**: Shipora's auto-generated Next.js Dockerfile copies `.next/standalone/` and runs `node server.js`. Without `output: "standalone"`, Next.js 16 does not produce this directory. Docker build crashes.

---

### FIX 2 — Create `public/.gitkeep` [CRITICAL]
**File**: `/Users/binova/Documents/Projects/Suru/Owed/public/.gitkeep`  
**Content**: (empty file)  
**Why**: No `public/` directory exists in Owed. Docker `COPY --from=builder /app/public ./public` fails if the directory doesn't exist in the build context. `.gitkeep` ensures git tracks the directory.

---

### FIX 3 — Create `app/health/route.ts` [RECOMMENDED]
**File**: `/Users/binova/Documents/Projects/Suru/Owed/app/health/route.ts`
```ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { status: "ok", timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
```
**Why**: Shipora's `verifyDeploymentActivity` probes `{serviceUrl}/health` as primary check. Without it, Shipora falls back to `/` (root page). The fallback works (root page returns 200, no auth middleware) but has higher latency. `/health` is zero-latency and eliminates any retry risk.

---

### FIX 4 — Add `CRON_SECRET` to `.env` and `.env.example` [CRITICAL]
**File**: `/Users/binova/Documents/Projects/Suru/Owed/.env`  
Add line: `CRON_SECRET=<generate a secure 32-char random token, e.g. openssl rand -hex 32>`

**File**: `/Users/binova/Documents/Projects/Suru/Owed/.env.example`  
Add line: `CRON_SECRET=your-cron-secret-token`

**Why**: Shipora's static AST scanner detects `process.env.CRON_SECRET` in `app/api/cron/reminders/route.ts:8`. During Conflict Guard pre-deploy, it validates that `CRON_SECRET` exists in your uploaded AWS Secrets Manager secret (`shipora/projects/{id}/env`). If the key was never uploaded (because it was never in `.env`), the check fails → `passed = false` → GitHub commit status = "failure" → deploy is blocked. The route's own runtime fallback (`if (!cronSecret) return true`) does NOT affect this static analysis.

---

### FIX 5 — (Optional) Add custom `Dockerfile` + `.dockerignore` [RECOMMENDED]
**File**: `/Users/binova/Documents/Projects/Suru/Owed/Dockerfile`
```dockerfile
# syntax=docker/dockerfile:1
# Owed — Production Dockerfile (Next.js 16 Standalone)

FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

**File**: `/Users/binova/Documents/Projects/Suru/Owed/.dockerignore`
```
node_modules
.next
.env*
!.env.example
.git
coverage
*.log
```
**Why**: Providing a custom Dockerfile prevents Shipora from auto-generating one, giving full build reproducibility across AWS/Azure/GCP/DO. Uses `npm ci` (faster, reproducible) vs Shipora's auto-generated `npm install`. Requires Fix 1 and Fix 2 to already be applied.

---

## What NOT to Change

- `.env` values for `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`: Dead config but harmless. Leave as-is unless cleaning up.
- `package-lock.json`: Passes Shipora's lockfile check. Do not convert to pnpm.
- `vercel.json`: Valid cron config for Vercel. No change needed.
- `app/layout.tsx`, `app/page.tsx`: No redirect/middleware issues. No change needed.

---

## Execution Order

1. Fix 1 (`next.config.ts`)
2. Fix 2 (`public/.gitkeep`)
3. Fix 4 (`CRON_SECRET` in `.env` + `.env.example`)
4. Fix 3 (`app/health/route.ts`)
5. Fix 5 (optional — `Dockerfile` + `.dockerignore`)
6. Commit and push → Shipora Conflict Guard should pass 100%
