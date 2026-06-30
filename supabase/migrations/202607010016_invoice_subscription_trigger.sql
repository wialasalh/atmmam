-- Auto-create invoice when a subscription is created with status 'active'

create or replace function public.auto_create_invoice_on_subscription()
returns trigger language plpgsql security definer as $$
declare
  v_pkg_name text;
  v_pkg_cycle text;
begin
  -- Only fire on new active subscriptions
  if new.status = 'active' then
    -- Skip if invoice already exists for this subscription
    if exists (
      select 1 from public.invoices
      where order_id = new.id  -- reusing order_id field to link subscription
    ) then
      return new;
    end if;

    -- Get package name
    select title_ar, billing_cycle
      into v_pkg_name, v_pkg_cycle
      from public.packages
      where id = new.package_id;

    insert into public.invoices (
      client_id,
      order_id,        -- using this to reference subscription id for uniqueness
      description,
      service_name,
      amount,
      tax_rate,
      tax_amount,
      total_amount,
      status,
      due_date
    ) values (
      new.client_id,
      new.id,          -- subscription id stored here
      'اشتراك: ' || coalesce(v_pkg_name, 'باقة'),
      v_pkg_name,
      new.base_price + new.extra_price,
      case when new.tax_amount > 0 and (new.base_price + new.extra_price) > 0
           then round((new.tax_amount / (new.base_price + new.extra_price)) * 100, 2)
           else 15 end,
      new.tax_amount,
      new.total_price,
      'paid',           -- subscription = already paid
      current_date
    );

    -- Mark as paid immediately since subscription was activated
    update public.invoices
      set status = 'paid', paid_at = now(), payment_method = 'bank_transfer'
      where order_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auto_invoice_subscription on public.subscriptions;
create trigger trg_auto_invoice_subscription
  after insert on public.subscriptions
  for each row execute function public.auto_create_invoice_on_subscription();
