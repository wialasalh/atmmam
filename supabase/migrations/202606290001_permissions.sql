-- Add permissions column to profiles table
alter table public.profiles add column if not exists permissions jsonb not null default '[]'::jsonb;
