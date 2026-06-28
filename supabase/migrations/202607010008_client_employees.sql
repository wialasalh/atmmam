create table if not exists public.client_employees (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  full_name text not null,
  position text,
  phone text,
  email text,
  national_id text,
  created_at timestamptz not null default now()
);

alter table public.client_employees enable row level security;

-- Clients can manage their own employees
create policy "client_employees_select" on public.client_employees
  for select using (
    exists (select 1 from public.clients c where c.id = client_id and c.user_id = auth.uid())
  );

create policy "client_employees_insert" on public.client_employees
  for insert with check (
    exists (select 1 from public.clients c where c.id = client_id and c.user_id = auth.uid())
  );

create policy "client_employees_update" on public.client_employees
  for update using (
    exists (select 1 from public.clients c where c.id = client_id and c.user_id = auth.uid())
  );

create policy "client_employees_delete" on public.client_employees
  for delete using (
    exists (select 1 from public.clients c where c.id = client_id and c.user_id = auth.uid())
  );

-- Staff can read all
create policy "client_employees_staff_select" on public.client_employees
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','operator','viewer'))
  );
