-- Video support. The `photos` table becomes the project media table: it keeps
-- its name (a rename would churn every query and share link) but now carries
-- a media_kind discriminator plus video-specific metadata.
--
-- Videos can't be compressed in the browser the way images are, so the client
-- uploads them as-is and generates a poster frame for the gallery — otherwise
-- every tile would pull down a multi-megabyte file on a phone.

create type media_kind as enum ('photo', 'video');

alter table photos
  add column media_kind media_kind not null default 'photo',
  add column mime_type text,
  add column size_bytes bigint,
  add column duration_seconds numeric(10, 2),
  -- Poster frame for videos; null for photos.
  add column thumbnail_path text;

create index photos_media_kind_idx on photos (project_id, media_kind);

-- Defense in depth: the storage layer rejects anything oversized or of an
-- unexpected type even if a client bypasses the app's own checks.
update storage.buckets
set
  file_size_limit = 52428800, -- 50 MB
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
where id = 'project-photos';
