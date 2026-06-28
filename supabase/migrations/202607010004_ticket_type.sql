-- Add type column to tickets for consultation differentiation

alter table public.tickets add column if not exists type text not null default 'ticket' check (type in ('ticket', 'consultation'));
create index if not exists tickets_type_idx on public.tickets(type);
