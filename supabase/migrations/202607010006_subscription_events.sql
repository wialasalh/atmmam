-- Track all financial events on subscriptions (extensions, renewals, cancellations, modifications)

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  event_type text not null check (event_type in ('created', 'extension', 'renewal', 'cancellation', 'reactivation', 'modification')),
  previous_data jsonb default '{}'::jsonb,
  new_data jsonb default '{}'::jsonb,
  price decimal(10,2) default 0,
  notes text default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_subscription_events_sub_id on public.subscription_events(subscription_id);
create index if not exists idx_subscription_events_created_at on public.subscription_events(created_at desc);
