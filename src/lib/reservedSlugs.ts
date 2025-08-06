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

export const shouldSkipCSVRecord = (businessName: string, email?: string, phone?: string): boolean => {
  // Generate potential slug from business name
  const potentialSlug = businessName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
  
  // Check if this would create a reserved slug
  if (isReservedSlug(potentialSlug)) {
    console.log(`🚫 Skipping CSV record "${businessName}" - would create reserved slug "${potentialSlug}"`);
    return true;
  }
  
  // Check for specific reserved contact info
  const reservedEmails = ['alex@kutable.com', 'admin@kutable.com', 'support@kutable.com'];
  const reservedPhones = ['(555) 123-4567'];
  
  if (email && reservedEmails.includes(email.toLowerCase())) {
    console.log(`🚫 Skipping CSV record "${businessName}" - reserved email "${email}"`);
    return true;
  }
  
  if (phone && reservedPhones.includes(phone)) {
    console.log(`🚫 Skipping CSV record "${businessName}" - reserved phone "${phone}"`);
    return true;
  }
  
  return false;
};