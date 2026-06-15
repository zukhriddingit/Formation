insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile avatars are publicly readable" on storage.objects;
drop policy if exists "users can upload own profile avatars" on storage.objects;
drop policy if exists "users can update own profile avatars" on storage.objects;
drop policy if exists "users can delete own profile avatars" on storage.objects;

create policy "profile avatars are publicly readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'profile-avatars');

create policy "users can upload own profile avatars"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "users can update own profile avatars"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "users can delete own profile avatars"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);
