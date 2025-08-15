import { supabase } from './supabase';
import { BUCKETS, paths } from './buckets';

export async function uploadGalleryItem(file: File, uid: string) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace('jpeg','jpg');
  const filename = `${crypto.randomUUID()}.${ext}`;
  const key = paths.galleryItem(uid, filename);
  const { error } = await supabase.storage.from(BUCKETS.gallery).upload(key, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKETS.gallery).getPublicUrl(key);
  return { url: `${data.publicUrl}?v=${Date.now()}`, key };
}