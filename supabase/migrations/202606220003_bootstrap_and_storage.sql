create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, role)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'operator')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_auth_user();

create unique index if not exists services_name_agency_unique on public.services(name, agency_id);

insert into public.agencies(name, logo_url) values
  ('وزارة التجارة', '/assets/agencies/ministry-commerce.svg'),
  ('هيئة الزكاة والضريبة والجمارك', '/assets/agencies/zatca-official.svg'),
  ('وزارة البلديات والإسكان', '/assets/agencies/ministry-municipalities-housing.svg'),
  ('وزارة الموارد البشرية والتنمية الاجتماعية', '/assets/agencies/ministry-human-resources.svg')
on conflict (name) do update set logo_url = excluded.logo_url;

insert into public.services(name, category, agency_id, default_duration_days, required_documents)
select 'تأسيس شركة ذات مسؤولية محدودة', 'التأسيس', id, 7, '["هوية الشركاء","بيانات العنوان","الاسم التجاري المقترح"]'::jsonb from public.agencies where name = 'وزارة التجارة'
on conflict (name, agency_id) do nothing;
insert into public.services(name, category, agency_id, default_duration_days, required_documents)
select 'إصدار سجل تجاري', 'التأسيس', id, 2, '["هوية المالك","بيانات النشاط"]'::jsonb from public.agencies where name = 'وزارة التجارة'
on conflict (name, agency_id) do nothing;
insert into public.services(name, category, agency_id, default_duration_days, required_documents)
select 'التسجيل في ضريبة القيمة المضافة', 'الزكاة والضريبة', id, 4, '["السجل التجاري","كشف الإيرادات","العنوان الوطني"]'::jsonb from public.agencies where name = 'هيئة الزكاة والضريبة والجمارك'
on conflict (name, agency_id) do nothing;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('order-documents', 'order-documents', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "staff read order documents" on storage.objects for select to authenticated
using (bucket_id = 'order-documents' and public.current_user_role() is not null);
create policy "operators upload order documents" on storage.objects for insert to authenticated
with check (bucket_id = 'order-documents' and public.can_manage_operations());
create policy "operators update order documents" on storage.objects for update to authenticated
using (bucket_id = 'order-documents' and public.can_manage_operations())
with check (bucket_id = 'order-documents' and public.can_manage_operations());
create policy "managers remove order documents" on storage.objects for delete to authenticated
using (bucket_id = 'order-documents' and public.current_user_role() in ('admin','manager'));

