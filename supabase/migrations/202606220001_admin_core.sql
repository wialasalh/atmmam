-- Atmmam operations core. Apply through Supabase migrations, never from the browser.
create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'manager', 'operator', 'viewer');
create type public.order_status as enum ('new', 'waiting_documents', 'in_progress', 'completed', 'cancelled', 'blocked');
create type public.order_priority as enum ('normal', 'high', 'urgent');
create type public.document_status as enum ('required', 'received', 'approved', 'rejected');
create type public.task_status as enum ('open', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'operator',
  phone text,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  agency_id uuid references public.agencies(id),
  default_duration_days integer check (default_duration_days is null or default_duration_days > 0),
  active boolean not null default true,
  required_documents jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  client_type text not null check (client_type in ('company', 'person')),
  name text not null,
  commercial_number text,
  national_id text,
  contact_name text,
  phone text not null,
  email text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference_no text not null unique,
  client_id uuid not null references public.clients(id),
  service_id uuid not null references public.services(id),
  agency_id uuid references public.agencies(id),
  status public.order_status not null default 'new',
  priority public.order_priority not null default 'normal',
  assignee_id uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  due_at timestamptz,
  next_action_text text,
  next_action_at timestamptz,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.order_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  name text not null,
  storage_path text,
  status public.document_status not null default 'required',
  rejection_reason text,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  title text not null,
  assignee_id uuid references public.profiles(id),
  due_at timestamptz,
  status public.task_status not null default 'open',
  completed_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.order_activity (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  event_type text not null,
  message text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index orders_status_idx on public.orders(status) where deleted_at is null;
create index orders_assignee_idx on public.orders(assignee_id) where deleted_at is null;
create index orders_client_idx on public.orders(client_id) where deleted_at is null;
create index orders_due_idx on public.orders(due_at) where deleted_at is null and status not in ('completed', 'cancelled');
create index tasks_due_idx on public.tasks(due_at) where status = 'open';
create index activity_order_idx on public.order_activity(order_id, created_at desc);

create or replace function public.current_user_role() returns public.app_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() and active = true $$;

create or replace function public.can_manage_operations() returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.current_user_role() in ('admin', 'manager', 'operator'), false) $$;

alter table public.profiles enable row level security;
alter table public.agencies enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.orders enable row level security;
alter table public.order_documents enable row level security;
alter table public.tasks enable row level security;
alter table public.order_activity enable row level security;
alter table public.audit_logs enable row level security;

create policy "staff read profiles" on public.profiles for select to authenticated using (public.current_user_role() is not null);
create policy "admin manage profiles" on public.profiles for all to authenticated using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "staff read agencies" on public.agencies for select to authenticated using (public.current_user_role() is not null);
create policy "managers manage agencies" on public.agencies for all to authenticated using (public.current_user_role() in ('admin','manager')) with check (public.current_user_role() in ('admin','manager'));
create policy "staff read services" on public.services for select to authenticated using (public.current_user_role() is not null);
create policy "managers manage services" on public.services for all to authenticated using (public.current_user_role() in ('admin','manager')) with check (public.current_user_role() in ('admin','manager'));
create policy "staff read clients" on public.clients for select to authenticated using (public.current_user_role() is not null);
create policy "operators manage clients" on public.clients for all to authenticated using (public.can_manage_operations()) with check (public.can_manage_operations());
create policy "staff read orders" on public.orders for select to authenticated using (public.current_user_role() is not null);
create policy "operators manage orders" on public.orders for all to authenticated using (public.can_manage_operations()) with check (public.can_manage_operations());
create policy "staff read documents" on public.order_documents for select to authenticated using (public.current_user_role() is not null);
create policy "operators manage documents" on public.order_documents for all to authenticated using (public.can_manage_operations()) with check (public.can_manage_operations());
create policy "staff read tasks" on public.tasks for select to authenticated using (public.current_user_role() is not null);
create policy "operators manage tasks" on public.tasks for all to authenticated using (public.can_manage_operations()) with check (public.can_manage_operations());
create policy "staff read activity" on public.order_activity for select to authenticated using (public.current_user_role() is not null);
create policy "operators add activity" on public.order_activity for insert to authenticated with check (public.can_manage_operations());
create policy "admins read audit" on public.audit_logs for select to authenticated using (public.current_user_role() in ('admin','manager'));
create policy "staff add audit" on public.audit_logs for insert to authenticated with check (public.current_user_role() is not null);

