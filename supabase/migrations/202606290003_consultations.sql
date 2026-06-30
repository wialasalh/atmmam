-- Dedicated fields for consultation-type tickets
alter table public.tickets add column if not exists consultation_method text; -- phone, zoom, in_person, written
alter table public.tickets add column if not exists consultation_phone text;
alter table public.tickets add column if not exists consultation_scheduled_at timestamptz;
alter table public.tickets add column if not exists consultation_meeting_link text;
alter table public.tickets add column if not exists consultation_price numeric;
alter table public.tickets add column if not exists consultation_status text not null default 'جديد';
-- جديد، مجدولة، منجزة، ملغاة

create index if not exists tickets_consultation_status_idx on public.tickets(consultation_status) where type = 'consultation';
