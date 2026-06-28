-- Atmmam packages and subscriptions system
-- Adds packages table and subscriptions for client portal

-- Add price to services (for individual service pricing)
alter table public.services add column if not exists price decimal(10,2);

-- Packages table
create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  title_ar text not null,
  title_en text,
  description_ar text,
  description_en text,
  category text not null default 'services' check (category in ('services', 'legal', 'founding')),
  tier_ar text not null default 'standard',
  tier_en text,
  price decimal(10,2) not null,
  original_price decimal(10,2),
  billing_cycle text not null default 'yearly' check (billing_cycle in ('monthly', 'yearly', 'quarterly', 'one-time')),
  features jsonb not null default '[]'::jsonb,
  max_employees integer default 0,
  extra_employee_price decimal(10,2) default 0,
  tax_percent decimal(5,2) default 15,
  is_active boolean not null default true,
  is_popular boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Client subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  package_id uuid not null references public.packages(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  status text not null default 'active' check (status in ('pending', 'active', 'cancelled', 'expired')),
  employee_count integer not null default 0,
  base_price decimal(10,2) not null,
  extra_price decimal(10,2) not null default 0,
  tax_amount decimal(10,2) not null default 0,
  total_price decimal(10,2) not null,
  billing_cycle text not null default 'yearly',
  start_date date not null default current_date,
  end_date date,
  cancelled_at timestamptz,
  cancelled_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists subscriptions_client_idx on public.subscriptions(client_id);
create index if not exists subscriptions_status_idx on public.subscriptions(status);
create index if not exists subscriptions_package_idx on public.subscriptions(package_id);
create index if not exists packages_category_idx on public.packages(category);
create index if not exists packages_active_idx on public.packages(is_active);

-- Enable RLS
alter table public.packages enable row level security;
alter table public.subscriptions enable row level security;

-- RLS Policies for packages
create policy "staff read packages"
  on public.packages for select
  to authenticated
  using (public.current_user_role() is not null);

create policy "clients read active packages"
  on public.packages for select
  to authenticated
  using (is_active = true);

create policy "managers manage packages"
  on public.packages for all
  to authenticated
  using (public.current_user_role() in ('admin', 'manager'))
  with check (public.current_user_role() in ('admin', 'manager'));

-- RLS Policies for subscriptions
create policy "staff read all subscriptions"
  on public.subscriptions for select
  to authenticated
  using (public.current_user_role() is not null);

create policy "clients read own subscriptions"
  on public.subscriptions for select
  to authenticated
  using (client_id in (select id from public.clients where user_id = auth.uid()));

create policy "clients create own subscriptions"
  on public.subscriptions for insert
  to authenticated
  with check (client_id in (select id from public.clients where user_id = auth.uid()));

create policy "staff manage subscriptions"
  on public.subscriptions for all
  to authenticated
  using (public.current_user_role() in ('admin', 'manager'))
  with check (public.current_user_role() in ('admin', 'manager'));

-- Updated_at trigger for packages
create or replace function public.set_packages_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_packages_updated_at on public.packages;
create trigger set_packages_updated_at
  before update on public.packages
  for each row execute function public.set_packages_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_packages_updated_at();
