-- =============================================================================
-- SECURITY FIXES BUNDLE
-- =============================================================================
-- 1. Fix profiles RLS: prevent clients from reading all staff profiles (HIGH)
-- 2. Fix ticket_messages RLS: remove conflicting overly-permissive policy (HIGH)
-- 3. Add RLS for ticket-attachments storage bucket (MEDIUM)
-- =============================================================================

-- ── 1. PROFILES RLS ─────────────────────────────────────────────────────────
-- The old policy "staff read profiles" allowed ANY authenticated user with a
-- non-null role to read ALL profiles (names, emails, phones). Since clients
-- have role='client' (not null), they could read every staff member's data.
-- This is a HIGH severity information disclosure vulnerability.

drop policy if exists "staff read profiles" on public.profiles;

-- Staff (admin/manager/operator/viewer) can read all profiles
create policy "staff read profiles"
  on public.profiles for select
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'manager', 'operator', 'viewer')
  );

-- Clients can only read their own profile
create policy "clients read own profile"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
  );

alter table public.profiles enable row level security;

-- ── 2. TICKET_MESSAGES RLS ──────────────────────────────────────────────────
-- Migration 20240001_advanced_tickets.sql added an overly-permissive policy:
--   CREATE POLICY "messages_visibility" ON ticket_messages
--     FOR SELECT USING (
--       is_internal = FALSE OR
--       EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
--               AND role IN ('admin','manager','operator'))
--     );
-- Since Supabase combines policies with OR, ANY authenticated user can read
-- ANY non-internal ticket message, regardless of ticket ownership.
-- This is a HIGH severity information disclosure vulnerability.
-- The correct policies from 202606220009 already handle this with ownership checks.

drop policy if exists "messages_visibility" on public.ticket_messages;

-- ── 3. TICKET-ATTACHMENTS STORAGE RLS ──────────────────────────────────────
-- No RLS policies were defined for this bucket in any migration, meaning
-- any authenticated user could potentially read/upload to this bucket.

-- Allow staff to manage all ticket attachments
create policy "staff manage ticket attachments"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'manager', 'operator', 'viewer')
  )
  with check (
    bucket_id = 'ticket-attachments'
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'manager', 'operator', 'viewer')
  );

-- Allow clients to read attachments for their own tickets
-- Path format: tickets/{ticket_id}/{filename}
create policy "clients read own ticket attachments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1 from public.tickets
      where tickets.id::text = (storage.foldername(name))[2]
      and tickets.user_id = auth.uid()
    )
  );

-- Allow clients to upload attachments for their own tickets
create policy "clients upload own ticket attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1 from public.tickets
      where tickets.id::text = (storage.foldername(name))[2]
      and tickets.user_id = auth.uid()
    )
  );
