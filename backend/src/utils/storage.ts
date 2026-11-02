import { supabase } from './supabase';

const SUPABASE_PUBLIC_URL = process.env.SUPABASE_URL;

const buildPublicObjectUrl = (bucket: string, objectPath: string) => {
  if (!SUPABASE_PUBLIC_URL) return '';
  return `${SUPABASE_PUBLIC_URL.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${objectPath}`;
};

export const sanitizeBucket = (bucket: string) => String(bucket || '').trim();

export const uploadPublicFile = async (args: {
  bucket: string;
  objectPath: string;
  buffer: Buffer;
  contentType?: string;
  upsert?: boolean;
}) => {
  const bucket = sanitizeBucket(args.bucket);
  const objectPath = String(args.objectPath || '').replace(/^\/+/, '');
  if (!bucket) throw new Error('bucket is required');
  if (!objectPath) throw new Error('objectPath is required');
  if (!args.buffer?.length) throw new Error('buffer is empty');

  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, args.buffer, {
      upsert: Boolean(args.upsert),
      contentType: args.contentType || 'application/octet-stream',
      cacheControl: '3600',
    });

  if (error) {
    throw new Error(error.message || 'Failed to upload file');
  }

  const publicUrl = buildPublicObjectUrl(bucket, objectPath);
  if (!publicUrl) {
    throw new Error('SUPABASE_URL not configured');
  }

  return {
    bucket,
    path: objectPath,
    publicUrl,
  };
};

// Parse a Supabase public object URL back into its { bucket, path }.
// Mirrors buildPublicObjectUrl. Returns null if the URL is not a public
// storage object URL (e.g. an external link or malformed value).
export const parsePublicUrl = (url: string): { bucket: string; path: string } | null => {
  if (!url || typeof url !== 'string') return null;
  const marker = '/storage/v1/object/public/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const rest = url.slice(idx + marker.length).split(/[?#]/)[0];
  const slash = rest.indexOf('/');
  if (slash === -1) return null;
  const bucket = rest.slice(0, slash);
  const rawPath = rest.slice(slash + 1);
  if (!bucket || !rawPath) return null;
  // Object paths are stored un-encoded; decode in case the URL was encoded.
  let path = rawPath;
  try {
    path = decodeURIComponent(rawPath);
  } catch {
    path = rawPath;
  }
  return { bucket, path };
};

// Permanently remove an object from a Supabase storage bucket.
// Throws on failure so callers can surface the error to the admin.
export const deletePublicFile = async (args: { bucket: string; path: string }) => {
  const bucket = sanitizeBucket(args.bucket);
  const path = String(args.path || '').replace(/^\/+/, '');
  if (!bucket) throw new Error('bucket is required');
  if (!path) throw new Error('path is required');

  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    throw new Error(error.message || 'Failed to delete file');
  }
  return { bucket, path };
};

// Resolve a stored document reference to { bucket, path } for deletion.
// Prefers explicit bucket/path metadata (e.g. deal_room_documents.data.file),
// falling back to parsing a public URL.
export const resolveStorageRef = (ref: {
  bucket?: string | null;
  path?: string | null;
  url?: string | null;
}): { bucket: string; path: string } | null => {
  if (ref?.bucket && ref?.path) {
    return { bucket: sanitizeBucket(ref.bucket), path: String(ref.path).replace(/^\/+/, '') };
  }
  if (ref?.url) return parsePublicUrl(ref.url);
  return null;
};
