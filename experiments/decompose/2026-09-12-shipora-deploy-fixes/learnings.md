# Learnings: Shipora Deploy Fixes for Owed

All 5 proposed fixes were traced end-to-end through Shipora's source code.

## Key Learnings

### L-1: The 5 fixes are all real — but severity differs

| Fix | Severity | Why |
|-----|----------|-----|
| `output: "standalone"` | **CRITICAL** | Docker build crashes — `.next/standalone` never produced |
| `public/.gitkeep` | **CRITICAL** | Docker build crashes — `COPY --from=builder /app/public` fails with ENOENT |
| `app/health/route.ts` | **RECOMMENDED** | Fallback to `/` exists but root page is slow in cold start; instant `/health` JSON eliminates any risk |
| `CRON_SECRET` in `.env` + `.env.example` | **CRITICAL** | Shipora's Conflict Guard statically detects `process.env.CRON_SECRET` and blocks deploy if key absent from uploaded secrets |
| Custom `Dockerfile` | **OPTIONAL** | Auto-generation handles Next.js correctly once fixes 1+2 applied |

### L-2: A bonus issue was discovered — Inngest keys are orphaned in .env

`INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` appear in `Owed/.env` and `.env.example` but have **zero usage** anywhere in the source code. These are likely from an earlier architecture. They don't cause Shipora failures (Shipora only scans `process.env.VAR` references in code), but they are dead configuration.

### L-3: Lockfile check passes despite 50-file fetch limit

Shipora fetches the first 50 files by content. `package-lock.json` is at position 56. BUT the lockfile scanner's dep cross-check is guarded by `if (lockfileContent)` — empty string is falsy, so the check is skipped. `hasNpmLock = true` from path detection → `isHealthy = true`. No action required.

### L-4: No `middleware.ts` exists — root route `/` always returns 200

Owed has no Next.js middleware. The root `page.tsx` is a pure `"use client"` component — server always sends a 200 HTML shell immediately. Shipora's fallback health probe to `/` would succeed. But `/health` is still worth adding (5 lines of code, removes any ambiguity).

### L-5: `CRON_SECRET` is optional at runtime but required by Shipora's static analysis

The cron route handler has a runtime guard: `if (!cronSecret) return true` (authorized). But Shipora's static analysis doesn't know this — it reads `process.env.CRON_SECRET` and adds it to the required env var list. The fix is to add a real value in `.env` so Shipora uploads it to AWS Secrets Manager and the validation passes.
