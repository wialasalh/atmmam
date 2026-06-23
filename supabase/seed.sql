-- Seed sample clients and orders for the admin panel
insert into public.clients(name, client_type, phone, email, notes, created_by)
select 'مؤسسة النهضة للتجارة', 'company', '966501234567', 'info@alnahdhah.com', 'عميل موجود مسبقاً، لديه سجل تجاري قديم', 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96'
where not exists (select 1 from public.clients where phone = '966501234567');

insert into public.clients(name, client_type, phone, email, notes, created_by)
select 'شركة التقنيات المتقدمة', 'company', '966555555111', 'ceo@tech-sa.com', 'تأسيس جديد', 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96'
where not exists (select 1 from public.clients where phone = '966555555111');

insert into public.clients(name, client_type, phone, email, notes, created_by)
select 'أحمد الغامدي', 'person', '966500000001', 'a.ghamdi@email.com', 'طلب تأسيس مؤسسة فردية', 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96'
where not exists (select 1 from public.clients where phone = '966500000001');

insert into public.clients(name, client_type, phone, email, notes, created_by)
select 'سارة القحطاني', 'person', '966500000002', 's.qahtani@email.com', 'متابعة تجديد رخصة بلدية', 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96'
where not exists (select 1 from public.clients where phone = '966500000002');

insert into public.clients(name, client_type, phone, email, notes, created_by)
select 'شركة البناء المتقن', 'company', '966555555222', 'info@alitqan.sa', 'ملف حماية أجور بحاجة متابعة', 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96'
where not exists (select 1 from public.clients where phone = '966555555222');

-- Insert sample orders
insert into public.orders(reference_no, client_id, service_id, agency_id, status, priority, assignee_id, next_action_text, notes, created_by)
select 'ORD-001', c.id, s.id, a.id, 'in_progress', 'high', 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96', 'انتظار الهوية الوطنية من الشريك الثاني', 'تم رفع السجل التجاري وانتظار المستندات', 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96'
from public.clients c, public.services s, public.agencies a
where c.name = 'مؤسسة النهضة للتجارة' and s.name = 'تأسيس شركة ذات مسؤولية محدودة' and a.name = 'وزارة التجارة'
and not exists (select 1 from public.orders where reference_no = 'ORD-001');

insert into public.orders(reference_no, client_id, service_id, agency_id, status, priority, assignee_id, next_action_text, next_action_at, notes, created_by)
select 'ORD-002', c.id, s.id, a.id, 'waiting_documents', 'normal', 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96', 'طلب عقد التأسيس من العميل', now() + interval '3 days', 'تم التواصل مع العميل وسيرسل المستندات قريباً', 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96'
from public.clients c, public.services s, public.agencies a
where c.name = 'شركة التقنيات المتقدمة' and s.name = 'تأسيس شركة ذات مسؤولية محدودة' and a.name = 'وزارة التجارة'
and not exists (select 1 from public.orders where reference_no = 'ORD-002');

insert into public.orders(reference_no, client_id, service_id, agency_id, status, priority, assignee_id, next_action_text, notes, created_by)
select 'ORD-003', c.id, s.id, a.id, 'new', 'urgent', 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96', 'تحديد النشاط التجاري مع العميل', 'عميل جديد يريد تأسيس مؤسسة فردية', 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96'
from public.clients c, public.services s, public.agencies a
where c.name = 'أحمد الغامدي' and s.name = 'إصدار سجل تجاري' and a.name = 'وزارة التجارة'
and not exists (select 1 from public.orders where reference_no = 'ORD-003');

insert into public.orders(reference_no, client_id, service_id, agency_id, status, priority, assignee_id, next_action_text, notes, completed_at, created_by)
select 'ORD-004', c.id, s.id, a.id, 'completed', 'normal', 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96', 'مكتمل - تسليم العميل', 'تم إصدار السجل التجاري وتسليمه للعميل', now() - interval '2 days', 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96'
from public.clients c, public.services s, public.agencies a
where c.name = 'سارة القحطاني' and s.name = 'إصدار سجل تجاري' and a.name = 'وزارة التجارة'
and not exists (select 1 from public.orders where reference_no = 'ORD-004');

insert into public.orders(reference_no, client_id, service_id, agency_id, status, priority, assignee_id, next_action_text, next_action_at, notes, created_by)
select 'ORD-005', c.id, s.id, a.id, 'in_progress', 'high', 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96', 'رفع التقرير الربع سنوي للزكاة', now() + interval '7 days', 'متابعة التسجيل في ضريبة القيمة المضافة', 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96'
from public.clients c, public.services s, public.agencies a
where c.name = 'شركة البناء المتقن' and s.name = 'التسجيل في ضريبة القيمة المضافة' and a.name = 'هيئة الزكاة والضريبة والجمارك'
and not exists (select 1 from public.orders where reference_no = 'ORD-005');

insert into public.orders(reference_no, client_id, service_id, agency_id, status, priority, assignee_id, next_action_text, notes, created_by)
select 'ORD-006', c.id, s.id, a.id, 'new', 'normal', 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96', 'مراجعة ملف حماية الأجور', 'استفسار عن مخالفة حماية أجور', 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96'
from public.clients c, public.services s, public.agencies a
where c.name = 'شركة البناء المتقن' and s.name = 'التسجيل في ضريبة القيمة المضافة' and a.name = 'هيئة الزكاة والضريبة والجمارك'
and not exists (select 1 from public.orders where reference_no = 'ORD-006');

-- Seed some activity log entries
insert into public.order_activity(order_id, actor_id, event_type, message)
select o.id, 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96', 'status_change', 'تم رفع الطلب للجهة المختصة'
from public.orders o where o.reference_no = 'ORD-001' and not exists (select 1 from public.order_activity where order_id = o.id limit 1);

insert into public.order_activity(order_id, actor_id, event_type, message)
select o.id, 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96', 'note', 'تم التواصل مع العميل لتأكيد البيانات'
from public.orders o where o.reference_no = 'ORD-002' and not exists (select 1 from public.order_activity where order_id = o.id limit 1);

insert into public.order_activity(order_id, actor_id, event_type, message)
select o.id, 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96', 'completed', 'تم تسليم السجل التجاري للعميل'
from public.orders o where o.reference_no = 'ORD-004' and not exists (select 1 from public.order_activity where order_id = o.id limit 1);

-- Seed audit log
insert into public.audit_logs(actor_id, entity_type, entity_id, action, metadata)
select 'ff0e6fa6-bbbd-45c8-b762-09c811df4d96', 'system', 'seed', 'data_seeded', '{"note":"تمت إضافة بيانات تجريبية للوحة التحكم"}'
where not exists (select 1 from public.audit_logs where action = 'data_seeded');
