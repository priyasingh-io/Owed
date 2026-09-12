# Decompose: Shipora Deploy Fixes for Owed
**Objective**: Determine which of the 5 proposed Shipora surgical fixes are truly required, which are optional, and whether any are wrong/missing — with file-level proof from both repos.

---

## Variable Tree

### VAR-1: Does `output: "standalone"` in `next.config.ts` break the Docker build if absent?
- **type**: leaf
- **depends_on**: []
- **sandbox**: read Shipora auto-generated Dockerfile + Next.js 16 build output docs
- **expected**: FAIL — Docker build will crash without `output: "standalone"` because generated Dockerfile runs `CMD ["node", "server.js"]` and copies `.next/standalone`
- **status**: ✅ CONFIRMED REQUIRED

**Evidence**:
- `EazyDeploy/packages/cloud-adapters/src/azure/dockerfile-generator.ts:115-120` — `COPY --from=builder /app/.next/standalone ./` + `CMD ["node", "server.js"]`
- `EazyDeploy/apps/temporal-worker/src/activities/build-container.ts:65` — identical pattern in CodeBuild buildspec
- `Owed/node_modules/next/package.json` → version `16.3.4` → `STANDALONE_DIRECTORY = 'standalone'` constant confirmed in Next.js 16 build source
- **Without this flag**, `next build` outputs to `.next/` but NOT `.next/standalone/`. Docker `COPY --from=builder /app/.next/standalone ./` fails → build crash.

---

### VAR-2: Does missing `public/` directory break the Docker build?
- **type**: leaf
- **depends_on**: [VAR-1]
- **sandbox**: check if `/app/public` exists in the Docker builder stage when `public/` is absent from repo
- **expected**: FAIL — Docker `COPY --from=builder /app/public ./public` fails if directory doesn't exist
- **status**: ✅ CONFIRMED REQUIRED

**Evidence**:
- `ls /Users/binova/Documents/Projects/Suru/Owed/public` → `NO_PUBLIC_DIR`
- `Owed/node_modules/next/dist/build/index.js:652` → `const hasPublicDir = existsSync(publicDir)` — Next.js reads it but does NOT create it if absent
- `COPY . .` in Dockerfile builder stage → `/app/public` does not exist
- Docker `COPY --from=builder /app/public ./public` → fails with "stat app/public: file does not exist"
- **Fix**: `public/.gitkeep` ensures the directory is tracked by git and present in build context → `COPY . .` includes it → builder stage has `/app/public` → runner `COPY` succeeds.

---

### VAR-3: Does adding `app/health/route.ts` prevent auto-rollback?
- **type**: leaf
- **depends_on**: []
- **sandbox**: read verify-deployment.ts probe logic + check root page behavior
- **expected**: HIGHLY RECOMMENDED but not strictly required — fallback to `/` exists
- **status**: ⚠️ RECOMMENDED, NOT CRITICAL (but low-effort, high-value)

**Evidence**:
- `verify-deployment.ts:173-176`:
  ```ts
  const healthUrl = serviceUrl + "/health";   // primary probe
  const rootUrl = serviceUrl + "/";            // fallback probe
  ```
- Fallback exists: if `/health` returns 404 or 405, Shipora probes `/` instead
- `Owed/app/page.tsx:1` → `"use client"` — pure client component, server always responds `200 OK` immediately with shell HTML (no server-side redirect or auth wall)
- `Owed/app/auth/actions.ts` → auth logic is behind POST form actions, no middleware intercepting `/`
- **No `middleware.ts` exists** in Owed → no route-level auth redirect
- **Conclusion**: Fallback probe to `/` would succeed. BUT `/health` is instant JSON (< 1ms), while `/` loads Google Fonts, renders React shell, fetches from Supabase client-side. Risk of slow load triggering retry is low but nonzero. Creating `app/health/route.ts` costs zero risk and eliminates it entirely.

---

### VAR-4: Does missing `CRON_SECRET` in `.env` / `.env.example` cause Conflict Guard to fail?
- **type**: leaf  
- **depends_on**: []
- **sandbox**: trace Shipora's static analysis → Conflict Guard → AWS Secrets Manager validation chain
- **expected**: YES — blocks deploy in production
- **status**: ✅ CONFIRMED REQUIRED

**Evidence**:
- `Owed/app/api/cron/reminders/route.ts:8` → `process.env.CRON_SECRET` referenced (hard reference, not optional import)
- Shipora's `detectEnvironmentVariables()` scans `*.ts` files for `process.env.VARNAME` pattern → **detects `CRON_SECRET`**
- `validate-env-vars.ts:60` → `missing = detectedVars.filter(v => !existingSet.has(v))`
- When you upload your `.env` to Shipora during onboarding, it stores keys in AWS Secrets Manager at `shipora/projects/{id}/env`
- Current `Owed/.env` **does NOT contain `CRON_SECRET`** (confirmed: `grep CRON .env` → empty)
- Current `Owed/.env.example` **does NOT contain `CRON_SECRET`** (confirmed)
- Shipora will detect `CRON_SECRET` as required → check Secrets Manager → not present → `missing = ["CRON_SECRET"]` → `passed = false` → GitHub status check FAILS → **deploy is blocked**

**Important nuance**: The route code itself is safe without `CRON_SECRET` (line 9-11: `if (!cronSecret) return true`). But Shipora does **static** analysis — it doesn't understand the "optional if absent" logic. It just sees `process.env.CRON_SECRET` and requires it.

**Fix**: Add `CRON_SECRET=<generated-token>` to both `.env` and `.env.example`. Value can be any secure random string.

---

### VAR-5: Does Owed's `package-lock.json` pass Shipora's lockfile health check?
- **type**: leaf
- **depends_on**: []
- **sandbox**: trace Shipora's lockfile scanner logic with Owed's file count
- **expected**: PASS — despite 50-file fetch limit
- **status**: ✅ PASSES (no action needed)

**Evidence**:
- `git ls-files | wc -l` → 85 tracked files in Owed
- Shipora fetches `candidateFiles.slice(0, 50)` → `package-lock.json` is at position 56 → **NOT fetched** (content missing)
- `scanLockfileHealth` checks `if (lockfileContent)` before doing dep cross-check
- `lockfileContent = fileMap.get("package-lock.json") || ""` → `""` is falsy → dep check is SKIPPED
- `hasNpmLock = true` (path detected in full treeItems list) → `lockfileType = "npm"`, `issues = []`
- **Result**: `isHealthy = true` ✓

---

### VAR-6: Is a custom `Dockerfile` required?
- **type**: leaf
- **depends_on**: [VAR-1, VAR-2]
- **sandbox**: trace Shipora's buildspec fallback logic
- **expected**: OPTIONAL — Shipora auto-generates a valid Next.js Dockerfile if VAR-1 and VAR-2 are fixed
- **status**: ℹ️ OPTIONAL BUT RECOMMENDED

**Evidence**:
- Shipora checks: `if [ ! -f "${userDockerfilePath}" ]` → if no `Dockerfile` exists, auto-generate
- Auto-generated Dockerfile for Next.js includes `output: "standalone"` assumption
- Once `next.config.ts` has `output: "standalone"` and `public/.gitkeep` exists, auto-generated Dockerfile works correctly
- **Benefit of custom Dockerfile**: Deterministic across AWS/Azure/GCP/DO; can pin `npm ci` instead of `npm install`; can set exact Node.js version
- **Risk without it**: None, assuming VAR-1 and VAR-2 are fixed

---

### VAR-7 (Bonus — discovered): Are `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in `.env` but never used in code?
- **type**: leaf
- **depends_on**: []
- **sandbox**: grep all source files for Inngest references
- **expected**: STALE env vars — safe to leave but creates extra Shipora secret validation surface
- **status**: ⚠️ INFORMATIONAL — may cause Shipora to fail if vars not uploaded

**Evidence**:
- `Owed/.env` contains `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`
- `grep -rn "INNGEST" app/ lib/ components/` → **zero results** in source code
- `Inngest` is in `.env.example` but nowhere in source
- **Shipora detection**: Since Shipora's static scan looks at `process.env.VAR` in code (not `.env`), it will NOT detect Inngest vars. The `.env` upload just stores them — they'd pass validation.
- **HOWEVER**: If `.env.example` is used by Shipora to derive required keys (check `env-example.ts` detector), they could appear as required.

---

## Summary Status

| Fix | Status | Verdict |
|-----|--------|---------|
| 1. `output: "standalone"` in `next.config.ts` | ✅ Confirmed required | **APPLY** |
| 2. `public/.gitkeep` | ✅ Confirmed required | **APPLY** |
| 3. `app/health/route.ts` | ⚠️ Recommended (fallback exists) | **APPLY** (zero-cost) |
| 4. `CRON_SECRET` in `.env` + `.env.example` | ✅ Confirmed required | **APPLY** |
| 5. Custom `Dockerfile` | ℹ️ Optional | **APPLY** (recommended) |
