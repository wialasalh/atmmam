-- ============================================================
-- Invoices system
-- Auto-generated when order status changes to "completed"
-- ============================================================

create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  invoice_number  text not null unique,           -- INV-2026-0001
  order_id        uuid references public.orders(id) on delete set null,
  client_id       uuid references public.clients(id) on delete cascade,
  user_id         uuid,                           -- auth.users
  description     text not null,
  service_name    text,
  amount          numeric(12,2) not null default 0,
  tax_rate        numeric(5,2)  not null default 15, -- 15% VAT
  tax_amount      numeric(12,2) not null default 0,
  total_amount    numeric(12,2) not null default 0,
  currency        text not null default 'SAR',
  payment_method  text,                           -- bank_transfer, cash, credit_card, stc_pay
  status          text not null default 'issued'  -- issued | paid | cancelled | refunded
                  check (status in ('issued','paid','cancelled','refunded')),
  notes           text,
  paid_at         timestamptz,
  due_date        date,
  created_by      uuid,                           -- admin who triggered
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-increment invoice number
create sequence if not exists public.invoice_seq start 1;

create or replace function public.generate_invoice_number()
returns text language plpgsql as $$
begin
  return 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_seq')::text, 4, '0');
end;
$$;

-- Trigger: set invoice_number on insert
create or replace function public.set_invoice_number()
returns trigger language plpgsql as $$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := public.generate_invoice_number();
  end if;
  -- compute tax & total
  new.tax_amount   := round(new.amount * (new.tax_rate / 100), 2);
  new.total_amount := new.amount + new.tax_amount;
  new.updated_at   := now();
  return new;
end;
$$;

drop trigger if exists trg_invoice_number on public.invoices;
create trigger trg_invoice_number
  before insert or update on public.invoices
  for each row execute function public.set_invoice_number();

-- Trigger: auto-create invoice when order → completed
create or replace function public.auto_create_invoice_on_order_complete()
returns trigger language plpgsql security definer as $$
declare
  v_client_id    uuid;
  v_user_id      uuid;
  v_service_name text;
  v_description  text;
  v_price        numeric;
begin
  -- only fire when status changes to 'completed'
  if new.status = 'completed' and (old.status is null or old.status <> 'completed') then
    -- skip if invoice already exists for this order
    if exists (select 1 from public.invoices where order_id = new.id) then
      return new;
    end if;

    -- get related data
    select s.name, s.price
      into v_service_name, v_price
      from public.services s
      join public.orders o on o.service_id = s.id
      where o.id = new.id
      limit 1;

    v_client_id := new.client_id;
    v_description := coalesce('خدمة: ' || v_service_name, 'طلب رقم ' || new.reference_no);

    insert into public.invoices (
      order_id, client_id, description, service_name,
      amount, status, due_date
    ) values (
      new.id,
      v_client_id,
      v_description,
      v_service_name,
      coalesce(v_price, 0),
      'issued',
      (now() + interval '30 days')::date
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auto_invoice on public.orders;
create trigger trg_auto_invoice
  after update on public.orders
  for each row execute function public.auto_create_invoice_on_order_complete();

-- RLS
alter table public.invoices enable row level security;

-- Client: see own invoices
create policy "client_view_own_invoices" on public.invoices
  for select using (
    client_id in (
      select id from public.clients where user_id = auth.uid()
    )
  );

-- Staff: full access
create policy "staff_all_invoices" on public.invoices
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin','manager','operator')
    )
  );

-- Indexes
create index if not exists idx_invoices_client_id on public.invoices(client_id);
create index if not exists idx_invoices_order_id  on public.invoices(order_id);
create index if not exists idx_invoices_status     on public.invoices(status);
