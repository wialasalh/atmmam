-- Extended client fields for complete client profile
alter table public.clients add column if not exists unified_register_number text;   -- الرقم الموحد للسجل التجاري
alter table public.clients add column if not exists company_address text;
alter table public.clients add column if not exists company_activity text;
alter table public.clients add column if not exists commercial_register_doc text;    -- storage path
alter table public.clients add column if not exists company_license_doc text;        -- storage path
alter table public.clients add column if not exists national_id_doc text;            -- storage path
alter table public.clients add column if not exists extra_docs jsonb default '[]'::jsonb;

-- Enable clients to update their extended fields via RLS
drop policy if exists "clients update own" on public.clients;
create policy "clients update own"
  on public.clients for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Storage bucket for client documents
insert into storage.buckets (id, name, public, avif_autodetection)
values ('client-documents', 'client-documents', false, false)
on conflict (id) do nothing;

-- Allow clients to upload to their folder
create policy "clients upload own docs"
  on storage.objects for insert
  with check (
    bucket_id = 'client-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "clients read own docs"
  on storage.objects for select
  using (
    bucket_id = 'client-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Staff can read all client docs
create policy "staff read all client docs"
  on storage.objects for select
  using (
    bucket_id = 'client-documents'
    and public.current_user_role() is not null
  );
