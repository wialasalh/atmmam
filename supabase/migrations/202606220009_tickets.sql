-- =============================================================
-- Migration 202606220009: Extended tickets system
-- Builds on 202606220007_tickets.sql which created basic tickets table
-- =============================================================

-- 1. Add columns to existing tickets table (safe to re-run)
alter table public.tickets add column if not exists user_id uuid references auth.users(id);
alter table public.tickets add column if not exists description text;
alter table public.tickets add column if not exists category text not null default 'استفسار';
alter table public.tickets add column if not exists assigned_to uuid references auth.users(id);
alter table public.tickets add column if not exists files jsonb default '[]'::jsonb;
alter table public.tickets add column if not exists updated_at timestamptz not null default now();

-- 2. Populate user_id from client_id for existing rows
update public.tickets t
  set user_id = c.user_id
  from public.clients c
  where t.client_id = c.id
  and t.user_id is null;

-- 3. Create ticket messages table
create table if not exists public.ticket_messages (
  id uuid not null default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  body text not null,
  created_at timestamptz not null default now(),
  constraint ticket_messages_pkey primary key (id)
);

alter table public.ticket_messages enable row level security;

-- 4. Drop old policies from 007 migration (safe)
drop policy if exists "clients view own tickets" on public.tickets;
drop policy if exists "clients create own tickets" on public.tickets;
drop policy if exists "clients update own tickets" on public.tickets;
drop policy if exists "staff update any ticket" on public.tickets;

-- 5. New RLS policies for tickets
create policy "clients select own tickets"
  on public.tickets for select
  using (user_id = auth.uid());

create policy "clients insert own tickets"
  on public.tickets for insert
  with check (user_id = auth.uid());

create policy "staff select all tickets"
  on public.tickets for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'manager', 'operator')
    )
  );

create policy "staff update tickets"
  on public.tickets for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'manager', 'operator')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'manager', 'operator')
    )
  );

-- 6. RLS for ticket messages
create policy "select ticket messages"
  on public.ticket_messages for select
  using (
    exists (
      select 1 from public.tickets
      where tickets.id = ticket_messages.ticket_id
      and (
        tickets.user_id = auth.uid()
        or exists (
          select 1 from public.profiles
          where profiles.id = auth.uid()
          and profiles.role in ('admin', 'manager', 'operator')
        )
      )
    )
  );

create policy "clients insert own messages"
  on public.ticket_messages for insert
  with check (
    exists (
      select 1 from public.tickets
      where tickets.id = ticket_messages.ticket_id
      and tickets.user_id = auth.uid()
    )
  );

create policy "staff insert messages"
  on public.ticket_messages for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'manager', 'operator')
    )
  );
