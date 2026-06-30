-- إصلاح trigger إنشاء سجل العميل تلقائياً عند التسجيل
create or replace function public.handle_new_auth_user()
returns trigger as $$
declare
  v_role public.app_role;
  v_client_type text;
  v_name text;
begin
  v_role := coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'operator');
  v_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  insert into public.profiles (id, full_name, role, phone)
  values (
    new.id,
    v_name,
    v_role,
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        role      = excluded.role,
        phone     = excluded.phone;

  -- إنشاء سجل clients تلقائياً لأي مستخدم من نوع client
  if v_role = 'client' then
    v_client_type := coalesce(new.raw_user_meta_data->>'client_type', 'person');

    insert into public.clients (client_type, name, phone, email, user_id, notes)
    values (
      v_client_type,
      coalesce(new.raw_user_meta_data->>'company_name', v_name),
      new.raw_user_meta_data->>'phone',
      new.email,
      new.id,
      'مسجل تلقائياً'
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;
