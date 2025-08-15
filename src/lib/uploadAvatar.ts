import { supabase } from './supabase';
import { BUCKETS, paths } from './buckets';

const extOf = (n: string) => (n.split('.').pop() || 'jpg').toLowerCase().replace('jpeg','jpg');

export async function uploadBarberAvatar(file: File, uid: string) {
  const ext = extOf(file.name);
  const key = paths.avatar(uid, ext);
  const { error } = await supabase.storage.from(BUCKETS.avatars).upload(key, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKETS.avatars).getPublicUrl(key);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function uploadBarberBanner(file: File, uid: string) {
  const ext = extOf(file.name);
  const key = paths.banner(uid, ext);
  const { error } = await supabase.storage.from(BUCKETS.avatars).upload(key, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKETS.avatars).getPublicUrl(key);
  return `${data.publicUrl}?v=${Date.now()}`;
}

/**
 * Uploads an avatar to the `avatars` bucket and returns a cache-busted public URL.
 * Role namespace = 'clients' | 'barbers' to keep paths tidy.
 */
export async function uploadAvatar(file: File, userId: string, role: 'clients' | 'barbers') {
  const ext = extOf(file.name);
  const safeExt = ['jpg','jpeg','png','webp','gif'].includes(ext) ? ext : 'jpg';
  const path = `${role}/${userId}/avatar_${Date.now()}.${safeExt}`;  // ✅ aligns with policies

  const { error } = await supabase.storage.from(BUCKETS.avatars).upload(path, file, {
    upsert: true,
    cacheControl: '3600',
    contentType: file.type || `image/${safeExt}`,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKETS.avatars).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`; // cache-buster
}