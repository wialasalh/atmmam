-- Dynamic package categories
-- Allows admins to create/edit categories for packages

create table if not exists public.package_categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text,
  slug text not null unique,
  color text not null default '#0875dc',
  icon text default 'Package',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert default categories
insert into public.package_categories (name_ar, name_en, slug, color, sort_order) values
  ('تأسيس الشركات', 'Founding', 'founding', '#0875dc', 1),
  ('باقات الخدمات', 'Services', 'services', '#7c3aed', 2),
  ('الباقات القانونية', 'Legal', 'legal', '#b45309', 3)
on conflict (slug) do nothing;

-- Indexes
create index if not exists package_categories_active_idx on public.package_categories(is_active);
create index if not exists package_categories_sort_idx on public.package_categories(sort_order);

-- RLS
alter table public.package_categories enable row level security;

-- Staff can read categories
create policy "staff read package categories"
  on public.package_categories for select
  to authenticated
  using (public.current_user_role() is not null);

-- Managers can manage categories
create policy "managers manage package categories"
  on public.package_categories for all
  to authenticated
  using (public.current_user_role() in ('admin', 'manager'))
  with check (public.current_user_role() in ('admin', 'manager'));

-- Clients can read active categories
create policy "clients read active categories"
  on public.package_categories for select
  to authenticated
  using (is_active = true);

-- Remove CHECK constraint on packages.category so it accepts any value
alter table public.packages alter column category drop default;
alter table public.packages alter column category type text;
alter table public.packages alter column category set default 'services';

-- Updated_at trigger
create or replace function public.set_package_categories_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_package_categories_updated_at on public.package_categories;
create trigger set_package_categories_updated_at
  before update on public.package_categories
  for each row execute function public.set_package_categories_updated_at();
