-- Initial Schema Migration for Owed (ClaimIt)
-- Based on Technical Requirements Document (TRD §3 & §8)

-- 1. Profiles Table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  reminder_lead_days int[] default '{30,7,1}',
  created_at timestamptz default now()
);

-- 2. Items Table (tracked purchases & warranties)
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
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
  status text default 'active' check (status in ('active', 'expiring_soon', 'expired', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Claims Table (AI-assisted warranty claims)
create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items(id) on delete cascade not null,
  issue_description text not null,
  draft_text text,
  status text default 'draft' check (status in ('draft', 'sent', 'resolved')),
  created_at timestamptz default now()
);

-- 4. Reminders Table (scheduled reminder tracking)
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items(id) on delete cascade not null,
  remind_at date not null,
  sent boolean default false,
  created_at timestamptz default now()
);

-- Indexes for query performance & cron lookup
create index if not exists idx_items_user_id on public.items(user_id);
create index if not exists idx_items_warranty_expiry_date on public.items(warranty_expiry_date);
create index if not exists idx_claims_item_id on public.claims(item_id);
create index if not exists idx_reminders_item_id on public.reminders(item_id);
create index if not exists idx_reminders_remind_at on public.reminders(remind_at, sent);

-- Enable Row-Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.claims enable row level security;
alter table public.reminders enable row level security;

-- Profiles Policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Items Policies
create policy "Users can read own items"
  on public.items for select
  using (auth.uid() = user_id);

create policy "Users can insert own items"
  on public.items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own items"
  on public.items for update
  using (auth.uid() = user_id);

create policy "Users can delete own items"
  on public.items for delete
  using (auth.uid() = user_id);

-- Claims Policies (via items ownership)
create policy "Users can read claims for their items"
  on public.claims for select
  using (
    exists (
      select 1 from public.items
      where items.id = claims.item_id and items.user_id = auth.uid()
    )
  );

create policy "Users can insert claims for their items"
  on public.claims for insert
  with check (
    exists (
      select 1 from public.items
      where items.id = claims.item_id and items.user_id = auth.uid()
    )
  );

create policy "Users can update claims for their items"
  on public.claims for update
  using (
    exists (
      select 1 from public.items
      where items.id = claims.item_id and items.user_id = auth.uid()
    )
  );

-- Reminders Policies (via items ownership)
create policy "Users can view reminders for their items"
  on public.reminders for select
  using (
    exists (
      select 1 from public.items
      where items.id = reminders.item_id and items.user_id = auth.uid()
    )
  );
