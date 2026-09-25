-- Transactions for logged-in users (Vẹt Vàng + ledger + budget share this table).
--
-- The repo never had CREATE TABLE for public.expenses (only RLS patches in
-- 20260416000000_security_rls_policies.sql). This migration is additive and
-- idempotent: it creates the table on a fresh project and only adds columns
-- on an existing one. No data is dropped or rewritten.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pot_id text,
  amount numeric not null,
  note text not null default '',
  category text not null default '',
  created_at timestamptz not null default now()
);

-- income rows share the table; existing rows are expenses
alter table public.expenses add column if not exists kind text not null default 'expense';
-- the day the money moved (created_at is when it was logged)
alter table public.expenses add column if not exists txn_date date;
alter table public.expenses add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'expenses_kind_check') then
    alter table public.expenses add constraint expenses_kind_check check (kind in ('expense', 'income'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'expenses_amount_positive') then
    alter table public.expenses add constraint expenses_amount_positive check (amount > 0) not valid;
  end if;
end $$;

create index if not exists expenses_user_date_idx on public.expenses (user_id, txn_date desc);

alter table public.expenses enable row level security;
alter table public.expenses force row level security;

drop policy if exists expenses_own_all on public.expenses;
create policy expenses_own_all
  on public.expenses
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
