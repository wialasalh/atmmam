-- ══════════════════════════════════════════════════
-- Ticket Enhancements: Tags, Time Tracking, Merge, Email Templates
-- ══════════════════════════════════════════════════

-- 1. Tags
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#0875dc',
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_tags (
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (ticket_id, tag_id)
);

-- 2. Time tracking
create table if not exists public.ticket_time_logs (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  minutes int not null check (minutes > 0),
  note text,
  logged_at timestamptz not null default now()
);

-- 3. Merge: add merged_into column to tickets
alter table public.tickets
  add column if not exists merged_into uuid references public.tickets(id) on delete set null;

-- 4. Email templates
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  trigger_event text not null unique,
  label_ar text not null,
  subject_ar text not null,
  body_ar text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.tags enable row level security;
alter table public.ticket_tags enable row level security;
alter table public.ticket_time_logs enable row level security;
alter table public.email_templates enable row level security;

create policy "staff can manage tags"
  on public.tags for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','manager','operator')));

create policy "staff can manage ticket_tags"
  on public.ticket_tags for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','manager','operator')));

create policy "staff can manage time logs"
  on public.ticket_time_logs for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','manager','operator')));

create policy "admins manage email templates"
  on public.email_templates for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','manager')));

-- Seed default tags
insert into public.tags (name, color) values
  ('عاجل', '#dc2626'),
  ('ينتظر الجهة', '#b45309'),
  ('مكتمل جزئياً', '#0f766e'),
  ('VIP', '#073766'),
  ('يحتاج مستندات', '#7c3aed')
on conflict (name) do nothing;

-- Seed default email templates
insert into public.email_templates (trigger_event, label_ar, subject_ar, body_ar) values
(
  'ticket_created',
  'عند فتح تذكرة جديدة',
  'تم استلام طلبك — {{ticket_id}}',
  'مرحباً {{client_name}}،

تم استلام تذكرتك بنجاح.

رقم التذكرة: {{ticket_id}}
الموضوع: {{ticket_title}}
الأولوية: {{priority}}

سيتواصل معك فريقنا خلال {{sla_hours}} ساعة.

مع التحية،
فريق أتمم'
),
(
  'ticket_status_changed',
  'عند تغيير حالة التذكرة',
  'تحديث على تذكرتك — {{ticket_id}}',
  'مرحباً {{client_name}}،

تم تحديث حالة تذكرتك:

رقم التذكرة: {{ticket_id}}
الحالة الجديدة: {{new_status}}

يمكنك متابعة تذكرتك من خلال لوحة التحكم.

مع التحية،
فريق أتمم'
),
(
  'ticket_resolved',
  'عند حل التذكرة',
  'تم حل طلبك — {{ticket_id}}',
  'مرحباً {{client_name}}،

يسعدنا إبلاغك بأنه تم حل تذكرتك بنجاح.

رقم التذكرة: {{ticket_id}}
الموضوع: {{ticket_title}}

نرجو تقييم خدمتنا من خلال لوحة التحكم.

مع التحية،
فريق أتمم'
),
(
  'ticket_reply',
  'عند الرد على التذكرة',
  'رد جديد على تذكرتك — {{ticket_id}}',
  'مرحباً {{client_name}}،

قام فريق الدعم بالرد على تذكرتك:

رقم التذكرة: {{ticket_id}}

"{{reply_preview}}"

يمكنك الرد من خلال لوحة التحكم.

مع التحية،
فريق أتمم'
)
on conflict (trigger_event) do nothing;
