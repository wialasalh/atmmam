-- Add audit tracking to subscriptions

alter table public.subscriptions add column if not exists updated_by uuid references public.profiles(id) on delete set null;

create index if not exists subscriptions_updated_by_idx on public.subscriptions(updated_by);
