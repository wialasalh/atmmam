-- Public avatars bucket: staff upload their own avatar, everyone can read
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Each authenticated staff member may upload (upsert) only their own avatar file
create policy "staff upload own avatar" on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and public.current_user_role() is not null and name = auth.uid()::text || '.jpg');

create policy "staff update own avatar" on storage.objects for update to authenticated
using  (bucket_id = 'avatars' and name = auth.uid()::text || '.jpg')
with check (bucket_id = 'avatars' and name = auth.uid()::text || '.jpg');

-- Public read (bucket is public but RLS still needs a permissive select policy)
create policy "public read avatars" on storage.objects for select
using (bucket_id = 'avatars');
