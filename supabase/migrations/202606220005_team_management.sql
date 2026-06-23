-- Team invitations table
create table if not exists team_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role app_role not null default 'operator',
  invited_by uuid references profiles(id),
  token text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','expired','cancelled')),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table team_invitations enable row level security;

create policy "admins manage invitations"
  on team_invitations for all
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

-- Add phone and email to profiles updates trigger
create or replace function handle_updated_profile()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Update the handle_new_auth_user to also accept metadata
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'operator'),
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop and recreate trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
