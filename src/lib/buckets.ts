// Canonical buckets + paths (stop any new writes to `barber-images`)
export const BUCKETS = {
  avatars: import.meta.env.VITE_AVATARS_BUCKET || 'avatars',      // profile headshots/banners
  gallery: 'gallery-media',                                       // portfolio images
} as const;

export const paths = {
  avatar: (uid: string, ext = 'jpg') => `barbers/${uid}/avatar_${Date.now()}.${ext}`,
  banner: (uid: string, ext = 'jpg') => `barbers/${uid}/banner_${Date.now()}.${ext}`,
  galleryItem: (uid: string, filename: string) => `barbers/${uid}/${filename}`,
};