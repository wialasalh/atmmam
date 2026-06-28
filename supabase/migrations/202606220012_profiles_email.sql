-- Add email column to profiles table for direct access
alter table public.profiles add column if not exists email text;

-- Backfill existing profiles with emails from auth.users
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and p.email is null;

-- Update trigger to store email on new auth user creation
create or replace function public.handle_new_auth_user()
returns trigger as $$
declare
  v_role public.app_role;
begin
  v_role := coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'operator');

  insert into public.profiles (id, full_name, role, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    v_role,
    new.raw_user_meta_data->>'phone',
    new.email
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
