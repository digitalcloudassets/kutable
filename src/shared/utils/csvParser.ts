export interface CSVBarber {
  business_name: string;
  owner_name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  bio?: string;
  website?: string;
  industry?: string;
  contact_first?: string;
  contact_last?: string;
  direct_phone?: string;
  county?: string;
}

export interface ParsedBarberProfile {
  id: string;
  slug: string;
  business_name: string;
  owner_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  bio: string;
  profile_image_url: string;
  banner_image_url?: string | null;
  is_claimed: boolean;
  is_active: boolean;
  average_rating: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
}

/**
 * Parse a single CSV line handling quoted fields with commas
 */
export const parseCSVLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
    i++;
  }
  
  // Add the last field
  values.push(current.trim());
  return values;
};

/**
 * Parse CSV text into structured barber data
 */
export const parseCSV = (csvText: string): CSVBarber[] => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());
  console.log('📋 CSV Headers found:', headers);
  
  const data: CSVBarber[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    const row: any = {};
    
    headers.forEach((header, index) => {
      const value = values[index]?.trim() || '';
      if (!value) return;
      
      // Map CSV headers to our schema
      switch (header) {
        case 'company_name':
        case 'company name':
        case 'business_name':
        case 'business name':
        case 'name':
          row.business_name = value;
          break;
        case 'contact_first':
        case 'contact first':
        case 'first_name':
        case 'first name':
          row.contact_first = value;
          break;
        case 'contact_last':
        case 'contact last':
        case 'last_name':
        case 'last name':
          row.contact_last = value;
          break;
        case 'owner_name':
        case 'owner name':
        case 'owner':
          row.owner_name = value;
          break;
        case 'phone':
        case 'phone_number':
        case 'phone number':
          row.phone = value;
          break;
        case 'direct_phone':
        case 'direct phone':
          row.direct_phone = value;
          break;
        case 'email':
        case 'email_address':
        case 'email address':
          row.email = value;
          break;
        case 'address':
        case 'street_address':
        case 'street address':
          row.address = value;
          break;
        case 'city':
          row.city = value;
          break;
        case 'state':
          row.state = value;
          break;
        case 'zip':
        case 'zip_code':
        case 'zip code':
        case 'postal_code':
        case 'postal code':
          row.zip_code = value;
          break;
        case 'county':
          row.county = value;
          break;
        case 'website':
        case 'website_url':
        case 'website url':
          row.website = value;
          break;
        case 'industry':
        case 'business_type':
        case 'business type':
        case 'category':
          row.industry = value;
          break;
      }
    });
    
    // Create owner_name from contact_first and contact_last if not provided
    if (!row.owner_name && (row.contact_first || row.contact_last)) {
      row.owner_name = `${row.contact_first || ''} ${row.contact_last || ''}`.trim();
    }
    
    // Use business_name as owner_name if still missing
    if (!row.owner_name && row.business_name) {
      row.owner_name = row.business_name;
    }
    
    // Use direct_phone if phone is missing
    if (!row.phone && row.direct_phone) {
      row.phone = row.direct_phone;
    }
    
    // Only add rows that have required business name
    if (row.business_name && row.business_name.length > 1) {
      data.push(row as CSVBarber);
    }
  }
  
  console.log(`✅ Successfully parsed ${data.length} barber profiles from CSV`);
  return data;
};

/**
 * Generate unique slug from business name
 */
export const generateSlug = (businessName: string, index: number): string => {
  let slug = businessName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
  
  slug += `-${index}`;
  return slug;
};

/**
 * Transform CSV data to barber profile format
 */
export const transformCSVToBarberProfiles = (csvData: CSVBarber[]): ParsedBarberProfile[] => {
  // Use only local clean barber images for CSV profiles
  const localBarberImages = [
    '/clean barbershop.jpeg',
    '/clean barbers.webp'
  ];
  
  return csvData.map((barber, index) => {
    const imageUrl = localBarberImages[index % localBarberImages.length];
    
    return {
      id: `csv-${index + 1}`,
      slug: generateSlug(barber.business_name, index),
      business_name: barber.business_name,
      owner_name: barber.owner_name,
      phone: barber.phone || barber.direct_phone || null,
      email: barber.email || null,
      address: barber.address || null,
      city: barber.city || null,
      state: barber.state || null,
      zip_code: barber.zip_code || null,
      bio: barber.industry 
        ? `Professional ${barber.industry.toLowerCase()} services at ${barber.business_name}. Contact us for appointments and more information.`
        : `Professional services at ${barber.business_name}. Contact us for appointments and more information.`,
      profile_image_url: imageUrl,
      banner_image_url: null,
      is_claimed: false,
      is_active: true,
      average_rating: Number((4.0 + Math.random() * 1.0).toFixed(1)),
      total_reviews: Math.floor(Math.random() * 50) + 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });
};

/**
 * Load and parse CSV data from the public directory
 */
export const loadCSVBarbers = async (): Promise<ParsedBarberProfile[]> => {
  try {
    console.log('📁 Loading barber directory from /Barbers.csv...');
    const response = await fetch('/Barbers.csv');
    
    if (!response.ok) {
      throw new Error(`Failed to load CSV file: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log(`📄 CSV file loaded successfully. Size: ${(csvText.length / 1024).toFixed(1)}KB`);
    
    const csvData = parseCSV(csvText);
    const profiles = transformCSVToBarberProfiles(csvData);
    
    console.log(`✅ Successfully transformed ${profiles.length} CSV profiles`);
    return profiles;
  } catch (error) {
    console.error('❌ Failed to load CSV barber data:', error);
    return [];
  }
};