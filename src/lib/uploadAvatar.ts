import { supabase } from './supabase';

const BUCKET = import.meta.env.VITE_AVATARS_BUCKET || 'avatars';

/**
 * Uploads an avatar to the `avatars` bucket and returns a cache-busted public URL.
 * Role namespace = 'clients' | 'barbers' to keep paths tidy.
 */
export async function uploadAvatar(file: File, userId: string, role: 'clients' | 'barbers') {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safeExt = ['jpg','jpeg','png','webp','gif'].includes(ext) ? ext : 'jpg';
  const path = `${role}/${userId}/avatar_${Date.now()}.${safeExt}`;  // ✅ aligns with policies

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: '3600',
    contentType: file.type || `image/${safeExt}`,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`; // cache-buster
}