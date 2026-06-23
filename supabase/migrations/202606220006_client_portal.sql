-- Add client role to app_role enum
alter type public.app_role add value 'client';

-- Link clients table to auth profiles
alter table public.clients add column if not exists user_id uuid references public.profiles(id);

-- Client documents table
create table if not exists public.client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  order_id uuid references public.orders(id),
  filename text not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint,
  storage_path text not null,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.client_documents enable row level security;

-- Update the auth trigger to handle client registrations
create or replace function public.handle_new_auth_user()
returns trigger as $$
declare
  v_role public.app_role;
begin
  v_role := coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'operator');

  insert into public.profiles (id, full_name, role, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    v_role,
    new.raw_user_meta_data->>'phone'
  );

  -- If role is client, also create a clients record
  if v_role = 'client' then
    insert into public.clients (client_type, name, phone, email, user_id, notes)
    values (
      coalesce(new.raw_user_meta_data->>'client_type', 'person'),
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      new.raw_user_meta_data->>'phone',
      new.email,
      new.id,
      'مسجل تلقائياً'
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Drop and recreate trigger (idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Policies for client_documents
create policy "clients view own documents"
  on public.client_documents for select
  using (
    client_id in (
      select c.id from public.clients c where c.user_id = auth.uid()
    )
    or public.current_user_role() is not null
  );

create policy "clients upload own documents"
  on public.client_documents for insert
  with check (
    client_id in (
      select c.id from public.clients c where c.user_id = auth.uid()
    )
  );

-- Update clients policy to allow clients to see their own record
drop policy if exists "staff read clients" on public.clients;
create policy "clients read own or staff read all"
  on public.clients for select
  using (
    user_id = auth.uid()
    or public.current_user_role() is not null
  );

-- Allow clients to update their own client record (limited fields)
create policy "clients update own"
  on public.clients for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
