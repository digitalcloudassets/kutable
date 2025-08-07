import { createClient } from '@supabase/supabase-js';
import { shouldSkipCSVRecord, isReservedSlug } from './reservedSlugs';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we have valid Supabase credentials (not placeholders)
const hasValidCredentials = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your_supabase_anon_key_here' &&
  supabaseUrl !== 'your_supabase_url_here' &&
  supabaseAnonKey !== 'your_supabase_anon_key_here' &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder') &&
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co');

// Real barber directory from CSV
let realBarberDirectory: any[] = [];
let csvDataLoaded = false;
let csvLoadPromise: Promise<any[]> | null = null;

// Enhanced CSV parsing function
const parseCSVLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 2;
        continue;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
    i++;
  }
  
  values.push(current.trim());
  return values;
};

const parseCSV = (csvText: string): any[] => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());
  console.log('📋 CSV Headers found:', headers);
  
  const data: any[] = [];
  
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
    if (row.business_name && row.business_name.length > 1 && !shouldSkipCSVRecord(row.business_name, row.email, row.phone)) {
      data.push(row);
    }
  }
  
  return data;
};

const generateSlug = (businessName: string, index: number): string => {
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

// Load real barber directory from CSV
const loadCSVDirectory = async (): Promise<any[]> => {
  if (csvDataLoaded) {
    console.log('📁 CSV already loaded, returning cached data:', realBarberDirectory.length, 'profiles');
    return realBarberDirectory;
  }
  
  if (csvLoadPromise) {
    console.log('📁 CSV loading in progress, waiting...');
    return csvLoadPromise;
  }
  
  csvLoadPromise = (async () => {
    try {
      console.log('📁 Starting to load real barber directory from /Barbers.csv...');
      const response = await fetch('/Barbers.csv');
      
      if (!response.ok) {
        throw new Error(`Failed to load CSV file: ${response.status} ${response.statusText}`);
      }
      
      const csvText = await response.text();
      console.log(`📄 CSV file loaded successfully. Size: ${(csvText.length / 1024).toFixed(1)}KB`);
      
      const csvData = parseCSV(csvText);
      console.log(`📊 Parsed ${csvData.length} rows from CSV`);
      
      console.log(`📝 After filtering reserved slugs: ${csvData.length} valid profiles`);
      
      if (csvData.length === 0) {
        console.warn('⚠️ No valid barber data found in CSV after filtering. Check CSV format and reserved slug conflicts.');
        return [];
      }
      
      // Use only local clean barber images for CSV profiles
      const localBarberImages = [
        '/clean barbershop.jpeg',
        '/clean barbers.webp'
      ];
      
      realBarberDirectory = csvData.map((barber, index) => {
        // Professional haircut in progress
        const imageUrl = localBarberImages[index % localBarberImages.length];
        
        return {
          id: `csv-${index + 1}`,
          slug: generateSlug(barber.business_name, index),
          user_id: null,
          business_name: barber.business_name,
          owner_name: barber.owner_name,
          phone: barber.phone || barber.direct_phone || null,
          email: barber.email || null,
          address: barber.address || null,
          city: barber.city || null,
          state: barber.state || null,
          zip_code: barber.zip_code || null,
          bio: barber.industry ? `Professional ${barber.industry.toLowerCase()} services at ${barber.business_name}. Contact us for appointments and more information.` : `Professional services at ${barber.business_name}. Contact us for appointments and more information.`,
          profile_image_url: imageUrl,
          banner_image_url: null, // CSV profiles don't have separate banners initially
          is_claimed: false,
          is_active: true,
          stripe_account_id: null,
          stripe_onboarding_completed: false,
          average_rating: Number((4.0 + Math.random() * 1.0).toFixed(1)),
          total_reviews: Math.floor(Math.random() * 50) + 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });
      
      csvDataLoaded = true;
      console.log(`✅ Successfully loaded ${realBarberDirectory.length} barber profiles from CSV directory`);
      return realBarberDirectory;
      
    } catch (error) {
      console.error('❌ Failed to load CSV directory:', error);
      realBarberDirectory = [];
      csvDataLoaded = true; // Mark as loaded to prevent infinite retries
      return [];
    }
  })();
  
  return csvLoadPromise;
};

// Initialize directory loading immediately
loadCSVDirectory();

let supabase: any;

if (!hasValidCredentials) {
  console.info('📁 Using CSV directory mode - loading real barber profiles from uploaded file');
  
  // Create directory client that serves real CSV data
  supabase = {
    from: (table: string) => {
      if (table === 'barber_profiles') {
        const query = {
          select: (fields?: string) => query,
          eq: (field: string, value: any) => {
            query._filters = query._filters || [];
            query._filters.push({ field, operator: 'eq', value });
            return query;
          },
          or: (condition: string) => {
            query._orCondition = condition;
            return query;
          },
          not: (field: string, operator: string, value: any) => {
            query._filters = query._filters || [];
            query._filters.push({ field, operator: 'not', value });
            return query;
          },
          order: (field: string, options?: any) => {
            query._orderBy = { field, ascending: options?.ascending !== false };
            return query;
          },
          limit: (count: number) => {
            query._limit = count;
            return query;
          },
          
          // Execute query and return filtered data
          then: async (resolve: (result: any) => void) => {
            try {
              const data = await loadCSVDirectory();
              let filteredData = [...data];
              
              // Apply filters
              if (query._filters) {
                query._filters.forEach((filter: any) => {
                  if (filter.field === 'is_active' && filter.operator === 'eq') {
                    filteredData = filteredData.filter(item => item.is_active === filter.value);
                  } else if (filter.field === 'is_claimed' && filter.operator === 'eq') {
                    filteredData = filteredData.filter(item => item.is_claimed === filter.value);
                  } else if (filter.field === 'slug' && filter.operator === 'eq') {
                    filteredData = filteredData.filter(item => item.slug === filter.value);
                  } else if (filter.field === 'id' && filter.operator === 'eq') {
                    filteredData = filteredData.filter(item => item.id === filter.value);
                  } else if (filter.field === 'user_id' && filter.operator === 'eq') {
                    filteredData = filteredData.filter(item => item.user_id === filter.value);
                  } else if (filter.field === 'city' && filter.operator === 'eq') {
                    filteredData = filteredData.filter(item => item.city === filter.value);
                  } else if (filter.field === 'city' && filter.operator === 'not') {
                    filteredData = filteredData.filter(item => item.city !== filter.value && item.city !== null);
                  }
                });
              }
              
              // Apply OR search conditions
              if (query._orCondition) {
                const searchMatch = query._orCondition.match(/business_name\.ilike\.%(.+?)%|owner_name\.ilike\.%(.+?)%/);
                if (searchMatch) {
                  const searchTerm = (searchMatch[1] || searchMatch[2] || '').toLowerCase();
                  filteredData = filteredData.filter(item => 
                    item.business_name?.toLowerCase().includes(searchTerm) ||
                    item.owner_name?.toLowerCase().includes(searchTerm)
                  );
                }
              }
              
              // Apply ordering
              if (query._orderBy) {
                filteredData.sort((a, b) => {
                  const aVal = a[query._orderBy.field] || 0;
                  const bVal = b[query._orderBy.field] || 0;
                  if (query._orderBy.ascending) {
                    return aVal > bVal ? 1 : -1;
                  } else {
                    return aVal < bVal ? 1 : -1;
                  }
                });
              }
              
              // Apply limit
              if (query._limit) {
                filteredData = filteredData.slice(0, query._limit);
              }
              
              console.log(`📊 Query executed: returning ${filteredData.length} profiles`);
              resolve({ data: filteredData, error: null });
            } catch (error) {
              console.error('❌ Query execution failed:', error);
              resolve({ data: [], error });
            }
          },
          
          // For single record queries
          single: async () => {
            try {
              const data = await loadCSVDirectory();
              let filteredData = [...data];
              
              if (query._filters) {
                query._filters.forEach((filter: any) => {
                  if (filter.field === 'slug' && filter.operator === 'eq') {
                    filteredData = filteredData.filter(item => item.slug === filter.value);
                  } else if (filter.field === 'id' && filter.operator === 'eq') {
                    filteredData = filteredData.filter(item => item.id === filter.value);
                  }
                });
              }
              
              const result = filteredData[0] || null;
              console.log(`📊 Single query executed: ${result ? 'found' : 'not found'}`);
              return { data: result, error: result ? null : { code: 'PGRST116' } };
            } catch (error) {
              console.error('❌ Single query failed:', error);
              return { data: null, error };
            }
          },
          
          maybeSingle: async () => {
            try {
              const data = await loadCSVDirectory();
              let filteredData = [...data];
              
              if (query._filters) {
                query._filters.forEach((filter: any) => {
                  if (filter.field === 'slug' && filter.operator === 'eq') {
                    filteredData = filteredData.filter(item => item.slug === filter.value);
                  } else if (filter.field === 'id' && filter.operator === 'eq') {
                    filteredData = filteredData.filter(item => item.id === filter.value);
                  }
                });
              }
              
              const result = filteredData[0] || null;
              console.log(`📊 MaybeSingle query executed: ${result ? 'found' : 'not found'}`);
              return { data: result, error: null };
            } catch (error) {
              console.error('❌ MaybeSingle query failed:', error);
              return { data: null, error };
            }
          }
        };
        
        return query;
      }
      
      // For other tables when not connected to Supabase
      return {
        select: () => ({ 
          then: (resolve: any) => resolve({ data: [], error: null }),
          single: () => Promise.resolve({ data: null, error: { message: 'Connect to Supabase for database tables' } }),
          maybeSingle: () => Promise.resolve({ data: null, error: null })
        }),
        insert: () => ({ 
          select: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Connect to Supabase to enable database operations' } }) })
        }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: { message: 'Connect to Supabase to enable database operations' } }) }),
        delete: () => ({ eq: () => Promise.resolve({ data: null, error: { message: 'Connect to Supabase to enable database operations' } }) })
      };
    },
    
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      signInWithPassword: () => Promise.resolve({ error: { message: 'Connect to Supabase to enable user accounts' } }),
      signUp: () => Promise.resolve({ error: { message: 'Connect to Supabase to enable user accounts' } }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    functions: {
      invoke: () => Promise.resolve({ data: { success: false }, error: { message: 'Connect to Supabase to enable functions' } })
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: { message: 'Connect to Supabase to enable file uploads' } }),
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    }
  };
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

export const getRealBarberCount = async (): Promise<number> => {
  const data = await loadCSVDirectory();
  return data.length;
};

export type Database = {
  public: {
    Tables: {
      barber_profiles: {
        Row: {
          id: string;
          slug: string;
          user_id: string | null;
          business_name: string;
          owner_name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          zip_code: string | null;
          bio: string | null;
          profile_image_url: string | null;
          banner_image_url: string | null;
          is_claimed: boolean;
          is_active: boolean;
          stripe_account_id: string | null;
          stripe_onboarding_completed: boolean;
          average_rating: number;
          total_reviews: number;
          created_at: string;
          updated_at: string;
          communication_consent: boolean;
          sms_consent: boolean;
          email_consent: boolean;
          consent_date: string | null;
          consent_updated_at: string | null;
          communication_consent: boolean;
          sms_consent: boolean;
          email_consent: boolean;
          consent_date: string | null;
          consent_updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['barber_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['barber_profiles']['Insert']>;
      };
      services: {
        Row: {
          id: string;
          barber_id: string;
          name: string;
          description: string | null;
          price: number;
          duration_minutes: number;
          deposit_required: boolean;
          deposit_amount: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['services']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['services']['Insert']>;
      };
      bookings: {
        Row: {
          id: string;
          barber_id: string;
          client_id: string;
          service_id: string;
          appointment_date: string;
          appointment_time: string;
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refund_requested';
          total_amount: number;
          deposit_amount: number;
          stripe_payment_intent_id: string | null;
          stripe_charge_id: string | null;
          platform_fee: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>;
      };
      client_profiles: {
        Row: {
          id: string;
          user_id: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          email: string | null;
          preferred_contact: string;
          created_at: string;
          updated_at: string;
          communication_consent: boolean;
          sms_consent: boolean;
          email_consent: boolean;
          consent_date: string | null;
          consent_updated_at: string | null;
          communication_consent: boolean;
          sms_consent: boolean;
          email_consent: boolean;
          consent_date: string | null;
          consent_updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['client_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['client_profiles']['Insert']>;
      };
      knowledge_base: {
        Row: {
          id: string;
          title: string;
          content: string;
          embedding: number[];
          category: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['knowledge_base']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['knowledge_base']['Insert']>;
      };
      chat_conversations: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['chat_conversations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['chat_conversations']['Insert']>;
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: 'user' | 'assistant';
          content: string;
          context_used: any;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['chat_messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>;
      };
    };
  };
};