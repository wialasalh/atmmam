-- جدول دعوات الأعضاء
create table if not exists public.client_invitations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'member',
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'pending', -- pending | accepted | expired
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

alter table public.client_invitations enable row level security;

create policy "invitations_owner_all" on public.client_invitations
  for all using (
    exists (select 1 from public.clients c where c.id = client_id and c.user_id = auth.uid())
  );

create policy "invitations_staff_select" on public.client_invitations
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','manager','operator','viewer'))
  );

-- ربط المستخدم المُدعى بالمنشأة
alter table public.profiles
  add column if not exists member_of_client_id uuid references public.clients(id) on delete set null;

-- الدور الجديد للموظف/الممثل المدعو
-- يُضاف 'member' ضمن القيم المقبولة في role
