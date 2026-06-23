-- Client support tickets table
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  title text not null,
  type text not null default 'استفسار عن خدمة',
  priority text not null default 'عادية',
  status text not null default 'جديدة',
  body text not null,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.tickets enable row level security;

-- Clients can view their own tickets; staff can view all
create policy "clients view own tickets"
  on public.tickets for select
  using (
    client_id in (select c.id from public.clients c where c.user_id = auth.uid())
    or public.current_user_role() is not null
  );

-- Clients can create tickets tied to themselves
create policy "clients create own tickets"
  on public.tickets for insert
  with check (
    client_id in (select c.id from public.clients c where c.user_id = auth.uid())
  );

-- Clients can update their own tickets (e.g. add messages)
create policy "clients update own tickets"
  on public.tickets for update
  using (
    client_id in (select c.id from public.clients c where c.user_id = auth.uid())
  )
  with check (
    client_id in (select c.id from public.clients c where c.user_id = auth.uid())
  );

-- Staff can update any ticket (status, messages)
create policy "staff update any ticket"
  on public.tickets for update
  using (public.current_user_role() is not null);
