-- Client employees / establishment representatives
-- Each client/company can have multiple employees/representatives
-- Linked to packages.max_employees limit

create table if not exists public.client_employees (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  position text,
  national_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists client_employees_client_idx on public.client_employees(client_id);
create index if not exists client_employees_active_idx on public.client_employees(is_active);

-- RLS
alter table public.client_employees enable row level security;

-- Staff can see all employees
create policy "staff read all employees"
  on public.client_employees for select
  to authenticated
  using (public.current_user_role() is not null);

-- Staff can manage employees
create policy "staff manage employees"
  on public.client_employees for all
  to authenticated
  using (public.current_user_role() in ('admin', 'manager'))
  with check (public.current_user_role() in ('admin', 'manager'));

-- Clients can see their own employees
create policy "clients read own employees"
  on public.client_employees for select
  to authenticated
  using (client_id in (select id from public.clients where user_id = auth.uid()));

-- Clients can manage their own employees
create policy "clients insert own employees"
  on public.client_employees for insert
  to authenticated
  with check (client_id in (select id from public.clients where user_id = auth.uid()));

create policy "clients update own employees"
  on public.client_employees for update
  to authenticated
  using (client_id in (select id from public.clients where user_id = auth.uid()))
  with check (client_id in (select id from public.clients where user_id = auth.uid()));

create policy "clients delete own employees"
  on public.client_employees for delete
  to authenticated
  using (client_id in (select id from public.clients where user_id = auth.uid()));

-- Updated_at trigger
create or replace function public.set_client_employees_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_client_employees_updated_at on public.client_employees;
create trigger set_client_employees_updated_at
  before update on public.client_employees
  for each row execute function public.set_client_employees_updated_at();

-- Add subscription_id to tickets for full integration
alter table public.tickets add column if not exists subscription_id uuid references public.subscriptions(id) on delete set null;
