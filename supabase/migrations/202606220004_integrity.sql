create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger services_set_updated_at before update on public.services for each row execute procedure public.set_updated_at();
create trigger clients_set_updated_at before update on public.clients for each row execute procedure public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute procedure public.set_updated_at();

create unique index clients_commercial_number_unique on public.clients(commercial_number) where commercial_number is not null and deleted_at is null;
create unique index clients_national_id_unique on public.clients(national_id) where national_id is not null and deleted_at is null;
create index clients_name_search_idx on public.clients using gin (to_tsvector('simple', name)) where deleted_at is null;
create index services_name_search_idx on public.services using gin (to_tsvector('simple', name)) where active = true;

alter table public.orders add constraint completed_order_has_date check (status <> 'completed' or completed_at is not null) not valid;
alter table public.order_documents add constraint received_document_has_path check (status = 'required' or storage_path is not null) not valid;

comment on table public.audit_logs is 'Immutable security and operational audit trail. No update or delete RLS policy is intentionally provided.';
comment on column public.orders.deleted_at is 'Soft-delete marker. Records remain available for audit and reporting.';

