create or replace function public.change_order_status(
  target_order_id uuid,
  target_status public.order_status,
  change_reason text default null
) returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_status public.order_status;
  updated_order public.orders;
begin
  if not public.can_manage_operations() then raise exception 'not_authorized'; end if;
  if target_status in ('cancelled', 'blocked') and nullif(trim(change_reason), '') is null then raise exception 'reason_required'; end if;
  select status into previous_status from public.orders where id = target_order_id and deleted_at is null for update;
  if previous_status is null then raise exception 'order_not_found'; end if;
  update public.orders set status = target_status, updated_at = now(), completed_at = case when target_status = 'completed' then now() else null end where id = target_order_id returning * into updated_order;
  insert into public.order_activity(order_id, actor_id, event_type, message, old_value, new_value)
  values(target_order_id, auth.uid(), 'status_changed', coalesce(change_reason, 'تم تحديث حالة الطلب'), jsonb_build_object('status', previous_status), jsonb_build_object('status', target_status));
  insert into public.audit_logs(actor_id, entity_type, entity_id, action, metadata)
  values(auth.uid(), 'order', target_order_id::text, 'status_changed', jsonb_build_object('from', previous_status, 'to', target_status));
  return updated_order;
end;
$$;

revoke all on function public.change_order_status(uuid, public.order_status, text) from public;
grant execute on function public.change_order_status(uuid, public.order_status, text) to authenticated;

