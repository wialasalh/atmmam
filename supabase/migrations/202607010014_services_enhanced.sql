-- Add new columns to services
alter table public.services add column if not exists description text;
alter table public.services add column if not exists subcategory text;

-- Add missing agencies
insert into public.agencies (name) values ('الهيئة السعودية للملكية الفكرية') on conflict do nothing;
insert into public.agencies (name) values ('وزارة الاستثمار') on conflict do nothing;
insert into public.agencies (name) values ('المديرية العامة للجوازات') on conflict do nothing;
