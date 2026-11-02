-- 011_make_profile_pics_bucket_public.sql
--
-- Profile pictures (and cover photos / event images) are uploaded to the
-- `profile-pics` bucket and their URLs are built as:
--   {SUPABASE_URL}/storage/v1/object/public/profile-pics/<path>
-- That public endpoint only serves files when the bucket's `public` flag is
-- true. The schema only ever marked the `uploads` bucket public, so the
-- `profile-pics` bucket (created out-of-band) was private and every avatar URL
-- returned HTTP 400 — which is why profile pictures did not load anywhere.
--
-- This migration makes the bucket exist and be public (idempotent), and adds a
-- public read policy on its objects for clients that go through the
-- authenticated object endpoint.

-- 1) Ensure the bucket exists and is public.
insert into storage.buckets (id, name, public)
values ('profile-pics', 'profile-pics', true)
on conflict (id) do update set public = true;

-- 2) Allow public (anon + authenticated) read access to objects in this bucket.
--    Public buckets are served without auth via the /object/public/ endpoint,
--    but this policy also covers the standard /object/ read path.
drop policy if exists "Public read access for profile-pics" on storage.objects;
create policy "Public read access for profile-pics"
  on storage.objects for select
  using (bucket_id = 'profile-pics');
