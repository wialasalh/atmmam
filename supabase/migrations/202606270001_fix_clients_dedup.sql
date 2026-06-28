-- 1. Deduplicate clients: if the same user_id has multiple records, keep the most recently updated one
delete from public.clients
where id in (
  select id from (
    select id, row_number() over (partition by user_id order by updated_at desc nulls last) as rn
    from public.clients
    where user_id is not null
  ) sub
  where rn > 1
);

-- 2. Backfill names from profiles where name is still 'عميل' (auto-created placeholder)
update public.clients c
set name = p.full_name
from public.profiles p
where c.user_id = p.id
  and c.name = 'عميل';

-- 3. Add unique constraint on user_id to prevent future duplicates
alter table public.clients add constraint clients_user_id_unique unique (user_id);
