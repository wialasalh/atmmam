-- =============================================================
-- Migration 202606220010: Extended company profile fields
-- Adds additional fields to clients table for company profiles
-- Supports multi-company per user
-- =============================================================

-- Add new columns to clients table
alter table public.clients add column if not exists city text;
alter table public.clients add column if not exists tax_number text;
alter table public.clients add column if not exists commercial_register_date date;
alter table public.clients add column if not exists commercial_register_expiry date;
alter table public.clients add column if not exists entity_size text;
alter table public.clients add column if not exists employee_count integer;
alter table public.clients add column if not exists company_scope text;
alter table public.clients add column if not exists company_status text default 'active';
alter table public.clients add column if not exists zakat_tax_doc text;
alter table public.clients add column if not exists national_address_doc text;

-- Update RLS: allow clients to insert their own records (for multi-company)
drop policy if exists "clients update own" on public.clients;
create policy "clients update own"
  on public.clients for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Allow clients to insert new company records (multi-company)
drop policy if exists "clients insert own" on public.clients;
create policy "clients insert own"
  on public.clients for insert
  with check (user_id = auth.uid());
