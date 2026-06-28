alter table public.tickets add column if not exists archived_at timestamptz default null;
