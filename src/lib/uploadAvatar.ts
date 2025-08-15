import { supabase } from './supabase';

function getExt(name: string) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : 'jpg';
}

/**
 * Uploads an avatar to the `avatars` bucket and returns a cache-busted public URL.
 * Role namespace = 'clients' | 'barbers' to keep paths tidy.
 */
export async function uploadAvatar(file: File, userId: string, role: 'clients' | 'barbers' = 'clients') {
  const ext = getExt(file.name);
  const path = `${role}/${userId}/avatar_${Date.now()}.${ext}`;
  const up = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (up.error) throw up.error;
  const pub = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${pub.data.publicUrl}?v=${Date.now()}`; // bust caches
  return url;
}