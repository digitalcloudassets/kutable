// Reserved slugs that should never be overwritten by CSV imports
export const RESERVED_SLUGS = [
  'kutable',
  'admin',
  'api',
  'dashboard',
  'support',
  'about',
  'contact',
  'help',
  'terms',
  'privacy',
  'legal'
];

export const isReservedSlug = (slug: string): boolean => {
  return RESERVED_SLUGS.includes(slug.toLowerCase());
};
