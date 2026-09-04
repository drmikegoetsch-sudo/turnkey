-- Raise the video ceiling from 50 MB to 100 MB (~2–3 minutes of phone video).
--
-- Three limits have to agree or uploads fail confusingly:
--   1. the project-wide storage limit  (Supabase dashboard / Management API)
--   2. this bucket's own limit         (below)
--   3. MAX_VIDEO_BYTES in src/lib/uploads.ts
-- The app checks #3 first so the user gets a friendly message instead of a
-- raw storage rejection.

update storage.buckets
set file_size_limit = 104857600 -- 100 MB
where id = 'project-photos';
