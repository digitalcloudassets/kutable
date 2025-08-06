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

export const generateSlug = (businessName: string, index: number): string => {
  let slug = businessName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .trim();
  
  // Add index suffix to ensure uniqueness
  slug += `-${index}`;
  
  return slug;
};

export const parseCSV = (csvText: string): CSVBarber[] => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Parse headers - handle quoted headers
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());
  console.log('CSV Headers found:', headers);
  
  const data: CSVBarber[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    const row: any = {};
    
    headers.forEach((header, index) => {
      const value = values[index]?.trim() || '';
      if (!value) return;
      
      // Map CSV headers to our schema - handle various formats
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
        default:
          // Store any other fields as-is
          row[header] = value;
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
  
  console.log(`Successfully parsed ${data.length} barber profiles from CSV`);
  return data;
};

// Parse a single CSV line handling quoted fields with commas
const parseCSVLine = (line: string): string[] => {
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

export const loadCSVBarbers = async (): Promise<CSVBarber[]> => {
  try {
    console.log('Loading real barber data from /Barbers.csv...');
    const response = await fetch('/Barbers.csv');
    if (!response.ok) {
      throw new Error(`Failed to load CSV file: ${response.status} ${response.statusText}`);
    }
    const csvText = await response.text();
    console.log(`CSV file loaded successfully. Size: ${(csvText.length / 1024).toFixed(1)}KB`);
    
    const data = parseCSV(csvText);
    console.log(`✅ Successfully loaded ${data.length} real barber profiles`);
    
    if (data.length === 0) {
      console.warn('⚠️ No valid barber data found in CSV. Check CSV format and required columns.');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error loading CSV barber data:', error);
    return [];
  }
};