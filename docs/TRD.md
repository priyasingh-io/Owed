# Technical Requirements Document (TRD)
## Product: ClaimIt *(working title)*

---

## 1. Architecture Overview

**Pattern:** Monolithic Next.js application (frontend + API routes) backed by a managed Postgres/Auth/Storage provider. Chosen for solo-dev velocity — avoids managing separate backend infrastructure while remaining scalable.

```
┌─────────────────────────────────────────────┐
│                Next.js App (Vercel)          │
│  ┌───────────────┐   ┌────────────────────┐ │
│  │  App Router UI │   │  API Routes / tRPC │ │
│  │ (React + TS)   │   │  (Server Functions)│ │
│  └───────────────┘   └────────────────────┘ │
└───────────────┬───────────────┬─────────────┘
                │               │
     ┌──────────▼──────┐   ┌────▼─────────────┐
     │ Supabase         │   │ Claude API        │
     │ (Postgres, Auth, │   │ (Vision + Text    │
     │  Storage)        │   │  extraction/draft)│
     └──────────────────┘   └───────────────────┘
                │
     ┌──────────▼──────────┐
     │ Background Jobs      │
     │ (Inngest / Supabase  │
     │  Edge Functions Cron)│
     └──────────┬────────────┘
                │
          ┌─────▼─────┐
          │  Resend    │
          │ (Email)    │
          └────────────┘
```

---

## 2. Tech Stack

| Layer | Technology | Justification |
|---|---|---|
| Frontend framework | Next.js 14 (App Router), TypeScript | SSR/SSG, file-based routing, strong ecosystem |
| UI | Tailwind CSS + shadcn/ui | Fast, consistent, accessible components |
| State/data fetching | React Server Components + tRPC (or Next API routes) | Type-safe client-server calls |
| Database | PostgreSQL (via Supabase) | Relational data fits item/warranty model; managed hosting |
| Auth | Supabase Auth (email/OTP) | Built-in, integrates directly with Postgres RLS |
| File storage | Supabase Storage | Receipt images/PDFs, signed URLs |
| AI/LLM | Claude API (claude-sonnet-4-6), vision-enabled | Structured extraction from receipt images/PDFs; claim drafting |
| Background jobs | Inngest (or Supabase cron Edge Functions) | Scheduled expiry checks, reminder dispatch |
| Email delivery | Resend | Transactional email for reminders |
| Hosting | Vercel | Native Next.js deployment, edge functions |
| Monitoring | Vercel Analytics + Sentry | Error tracking, performance monitoring |

---

## 3. Data Model

```sql
-- users table (managed by Supabase Auth, extended with profile table)
create table profiles (
  id uuid primary key references auth.users(id),
  email text not null,
  reminder_lead_days int[] default '{30,7,1}',
  created_at timestamptz default now()
);

create table items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  product_name text not null,
  brand text,
  category text,
  seller text,
  purchase_date date,
  price numeric,
  currency text default 'INR',
  warranty_months int,
  warranty_expiry_date date,
  receipt_file_url text,
  extraction_confidence numeric,
  status text default 'active', -- active | expiring_soon | expired | archived
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table claims (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id) not null,
  issue_description text not null,
  draft_text text,
  status text default 'draft', -- draft | sent | resolved
  created_at timestamptz default now()
);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id) not null,
  remind_at date not null,
  sent boolean default false,
  created_at timestamptz default now()
);
```

**Row-Level Security (RLS):** Enforced on all tables — users can only read/write rows where `user_id = auth.uid()` (joined via `item_id` for `claims`/`reminders`).

---

## 4. Core Workflows

### 4.1 Receipt Upload & Extraction
1. Client uploads file to Supabase Storage bucket `receipts/{user_id}/{uuid}.ext`
2. API route receives storage reference, calls Claude API with the image/PDF + extraction prompt requesting structured JSON:
   ```
   {
     "product_name": string,
     "brand": string | null,
     "category": string,
     "seller": string | null,
     "purchase_date": "YYYY-MM-DD" | null,
     "price": number | null,
     "currency": string,
     "warranty_months": number | null,
     "confidence": number (0-1)
   }
   ```
3. If `warranty_months` is null, fall back to a static lookup table by `category` (e.g., electronics → 12 months default) and flag as inferred.
4. Insert row into `items`; compute `warranty_expiry_date = purchase_date + warranty_months`.
5. If `confidence < 0.7`, mark item for user review before it's considered "confirmed."

### 4.2 Expiry Reminder Job
1. Daily cron (Inngest scheduled function) queries items where `warranty_expiry_date - today` matches any value in the user's `reminder_lead_days`.
2. For each match, create a `reminders` row (idempotent — check not already sent for that lead day) and enqueue an email via Resend.
3. Mark `reminders.sent = true` on successful delivery.

### 4.3 Claim Draft Generation
1. User submits issue description for an item.
2. API route sends item details + issue description to Claude API with a prompt to produce a formal claim/complaint email.
3. Response stored in `claims.draft_text`; returned to user for review/edit/copy.

---

## 5. API Surface (representative)

| Endpoint | Method | Description |
|---|---|---|
| `/api/items` | GET | List user's items (filter/sort params) |
| `/api/items` | POST | Create item manually |
| `/api/items/:id` | PATCH | Edit item fields |
| `/api/items/:id` | DELETE | Archive/delete item |
| `/api/items/upload` | POST | Upload receipt, trigger extraction |
| `/api/claims` | POST | Generate claim draft for an item |
| `/api/reminders/settings` | PATCH | Update user reminder preferences |

*(If using tRPC, these become typed procedures rather than REST routes — implementation detail left to dev preference.)*

---

## 6. AI Integration Details

- **Model:** claude-sonnet-4-6 (vision-capable) for receipt extraction; same model for claim drafting.
- **Extraction prompt strategy:** System prompt instructs strict JSON-only output, explicit field schema, and instructions to infer warranty length by product category when not stated, with a confidence score.
- **Cost control:** Cache category → default warranty mappings locally to avoid redundant inference calls; only call AI for extraction (not for computing expiry dates, which is done in application code).
- **Failure handling:** If extraction fails or returns malformed JSON, surface a manual-entry form pre-filled with any partial data recovered.

---

## 7. Security & Privacy

- All traffic over HTTPS.
- Receipt files stored in private Supabase Storage buckets, accessed only via signed, time-limited URLs.
- RLS on every table — no cross-user data access at the database layer.
- PII minimization: only store what's needed for tracking (no full financial account numbers, IDs, etc.).
- Account deletion cascades: removes items, claims, reminders, and storage files.
- Rate limiting on upload and AI-calling endpoints to prevent abuse/cost overrun.

---

## 8. Non-Functional / Infra Requirements

| Requirement | Approach |
|---|---|
| Extraction latency ≤10s (p95) | Async upload with client-side loading state; timeout + retry once on failure |
| 99.5% uptime | Vercel + Supabase managed SLAs; Sentry alerting |
| Scalability to ~50k users | Postgres indexes on `user_id`, `warranty_expiry_date`; connection pooling via Supabase pooler |
| Observability | Sentry for errors, Vercel Analytics for usage, structured logging in API routes |
| CI/CD | GitHub Actions → Vercel preview deployments per PR, auto-deploy on merge to main |

---

## 9. Phase 2 Technical Notes (Unclaimed Money Finder — India Pilot)

- **Data sources:** IEPF (unclaimed dividends/shares) and EPFO (unclaimed PF) — both require identity-matching (PAN/UAN) against publicly searchable records; no unified API, likely requires structured scraping or manual lookup flow with user-provided identifiers.
- **New tables:** `unclaimed_matches (user_id, source, match_details jsonb, status)`
- **Compliance:** Must clearly disclaim this is an information/assistance tool, not a legal or financial advisory service; store minimal identity data, ideally not persisted beyond the lookup session unless user opts in.

---

## 10. Suggested Build Sequence (maps to PRD release plan)

1. Project scaffold: Next.js + Supabase + auth (Week 1)
2. Items CRUD + manual entry (Week 1)
3. Receipt upload + Claude extraction pipeline (Week 2)
4. Dashboard UI with status logic (Week 2-3)
5. Reminder cron + Resend integration (Week 3)
6. Claim draft generator (Week 4)
7. QA, edge cases, deploy polish (Week 5-6)
