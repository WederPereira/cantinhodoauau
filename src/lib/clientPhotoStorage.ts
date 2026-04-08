import { supabase } from '@/integrations/supabase/client';

const PET_PHOTOS_BUCKET = 'avatars';
const CLIENT_PHOTO_PREFIX = 'clients/';
const PUBLIC_BUCKET_SEGMENT = `/storage/v1/object/public/${PET_PHOTOS_BUCKET}/`;

const MIME_TYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

const getFileExtension = (file: File) => {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName) return fromName;
  return MIME_TYPE_EXTENSIONS[file.type] || 'jpg';
};

const getStoragePathFromUrl = (photoUrl?: string | null) => {
  if (!photoUrl) return null;

  try {
    const parsedUrl = new URL(photoUrl);
    const publicPathIndex = parsedUrl.pathname.indexOf(PUBLIC_BUCKET_SEGMENT);

    if (publicPathIndex === -1) return null;

    const storagePath = parsedUrl.pathname.slice(publicPathIndex + PUBLIC_BUCKET_SEGMENT.length);
    if (!storagePath.startsWith(CLIENT_PHOTO_PREFIX)) return null;

    return decodeURIComponent(storagePath);
  } catch {
    return null;
  }
};

export const uploadClientPhoto = async (file: File, previousPhoto?: string) => {
  const fileExtension = getFileExtension(file);
  const filePath = `${CLIENT_PHOTO_PREFIX}${crypto.randomUUID()}.${fileExtension}`;

  const { error: uploadError } = await supabase.storage
    .from(PET_PHOTOS_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) throw uploadError;

  if (previousPhoto) {
    void deleteClientPhoto(previousPhoto).catch(() => undefined);
  }

  const { data } = supabase.storage.from(PET_PHOTOS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
};

export const deleteClientPhoto = async (photoUrl?: string | null) => {
  const storagePath = getStoragePathFromUrl(photoUrl);
  if (!storagePath) return;

  const { error } = await supabase.storage.from(PET_PHOTOS_BUCKET).remove([storagePath]);
  if (error) throw error;
};

export const isStoredClientPhoto = (photoUrl?: string | null) => {
  return Boolean(getStoragePathFromUrl(photoUrl));
};
