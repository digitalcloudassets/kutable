import { createClient } from '@supabase/supabase-js';
import { loadCSVBarbers, ParsedBarberProfile } from '../utils/csvParser';
import { shouldSkipCSVRecord, isReservedSlug } from '../utils/reservedSlugs';

interface BarberDataServiceConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export interface BarberQueryOptions {
  slug?: string;
  id?: string;
  isActive?: boolean;
  isClaimed?: boolean;
  city?: string;
  searchTerm?: string;
  limit?: number;
  orderBy?: 'rating' | 'reviews' | 'name' | 'newest';
}

export class BarberDataService {
  private supabase: any;
  private isConnected: boolean;
  private csvCache: ParsedBarberProfile[] | null = null;
  private csvLoadPromise: Promise<ParsedBarberProfile[]> | null = null;

  constructor(config?: BarberDataServiceConfig) {
    this.isConnected = this.checkConnection(config);
    this.supabase = this.initializeClient(config);
  }

  private checkConnection(config?: BarberDataServiceConfig): boolean {
    const supabaseUrl = config?.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = config?.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

    return supabaseUrl && 
      supabaseAnonKey && 
      supabaseUrl !== 'https://your-project.supabase.co' &&
      supabaseAnonKey !== 'your_supabase_anon_key_here' &&
      supabaseUrl !== 'your_supabase_url_here' &&
      supabaseAnonKey !== 'your_supabase_anon_key_here' &&
      !supabaseUrl.includes('placeholder') &&
      !supabaseAnonKey.includes('placeholder') &&
      supabaseUrl.startsWith('https://') &&
      supabaseUrl.includes('.supabase.co');
  }

  private initializeClient(config?: BarberDataServiceConfig) {
    if (this.isConnected) {
      const supabaseUrl = config?.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = config?.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY;
      return createClient(supabaseUrl, supabaseAnonKey);
    }

    return this.createMockClient();
  }

  private createMockClient() {
    return {
      from: (table: string) => {
        if (table === 'barber_profiles') {
          return this.createBarberProfilesQuery();
        }
        
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
  }

  private createBarberProfilesQuery() {
    const query = {
      _filters: [] as any[],
      _orCondition: '',
      _orderBy: null as any,
      _limit: null as number | null,

      select: (fields?: string) => query,
      
      eq: (field: string, value: any) => {
        query._filters.push({ field, operator: 'eq', value });
        return query;
      },
      
      or: (condition: string) => {
        query._orCondition = condition;
        return query;
      },
      
      not: (field: string, operator: string, value: any) => {
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
      
      then: async (resolve: (result: any) => void) => {
        const data = await this.executeQuery(query);
        resolve({ data, error: null });
      },
      
      single: async () => {
        const data = await this.executeQuery(query);
        const result = data[0] || null;
        return { data: result, error: result ? null : { code: 'PGRST116' } };
      },
      
      maybeSingle: async () => {
        const data = await this.executeQuery(query);
        const result = data[0] || null;
        return { data: result, error: null };
      }
    };
    
    return query;
  }

  private async executeQuery(query: any): Promise<ParsedBarberProfile[]> {
    const data = await this.loadCSVData();
    let filteredData = [...data];
    
    // Apply filters
    if (query._filters) {
      query._filters.forEach((filter: any) => {
        switch (filter.field) {
          case 'is_active':
            if (filter.operator === 'eq') {
              filteredData = filteredData.filter(item => item.is_active === filter.value);
            }
            break;
          case 'is_claimed':
            if (filter.operator === 'eq') {
              filteredData = filteredData.filter(item => item.is_claimed === filter.value);
            }
            break;
          case 'slug':
            if (filter.operator === 'eq') {
              filteredData = filteredData.filter(item => item.slug === filter.value);
            }
            break;
          case 'id':
            if (filter.operator === 'eq') {
              filteredData = filteredData.filter(item => item.id === filter.value);
            }
            break;
          case 'city':
            if (filter.operator === 'eq') {
              filteredData = filteredData.filter(item => item.city === filter.value);
            } else if (filter.operator === 'not') {
              filteredData = filteredData.filter(item => item.city !== filter.value && item.city !== null);
            }
            break;
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
    
    return filteredData;
  }

  private async loadCSVData(): Promise<ParsedBarberProfile[]> {
    if (this.csvCache) {
      return this.csvCache;
    }
    
    if (this.csvLoadPromise) {
      return this.csvLoadPromise;
    }
    
    this.csvLoadPromise = loadCSVBarbers().then(profiles => {
      // Filter out reserved slugs and invalid records
      const validProfiles = profiles.filter(profile => 
        !shouldSkipCSVRecord(profile.business_name, profile.email, profile.phone) &&
        !isReservedSlug(profile.slug)
      );
      
      this.csvCache = validProfiles;
      return validProfiles;
    });
    
    return this.csvLoadPromise;
  }

  /**
   * Get all barber profiles with optional filtering
   */
  async getBarberProfiles(options: BarberQueryOptions = {}): Promise<{ data: ParsedBarberProfile[]; error: any }> {
    try {
      let claimedProfiles: ParsedBarberProfile[] = [];
      
      // Try to get claimed profiles from database first
      if (this.isConnected) {
        try {
          let query = this.supabase
            .from('barber_profiles')
            .select('*');

          // Apply filters
          if (options.isActive !== undefined) {
            query = query.eq('is_active', options.isActive);
          }
          if (options.isClaimed !== undefined) {
            query = query.eq('is_claimed', options.isClaimed);
          }
          if (options.city) {
            query = query.eq('city', options.city);
          }
          if (options.searchTerm) {
            query = query.or(`business_name.ilike.%${options.searchTerm}%,owner_name.ilike.%${options.searchTerm}%`);
          }

          // Apply ordering
          if (options.orderBy) {
            switch (options.orderBy) {
              case 'rating':
                query = query.order('average_rating', { ascending: false });
                break;
              case 'reviews':
                query = query.order('total_reviews', { ascending: false });
                break;
              case 'name':
                query = query.order('business_name', { ascending: true });
                break;
              case 'newest':
                query = query.order('created_at', { ascending: false });
                break;
            }
          }

          if (options.limit) {
            query = query.limit(options.limit);
          }

          const { data: dbProfiles } = await query;
          
          if (dbProfiles) {
            claimedProfiles = dbProfiles.map(profile => ({
              ...profile,
              profile_image_url: profile.profile_image_url || 'https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&w=400'
            }));
          }
        } catch (error) {
          console.warn('Database query failed, using CSV only:', error);
        }
      }
      
      // Load CSV profiles (unclaimed directory listings)
      const csvProfiles = await this.loadCSVData();
      
      // Combine: Database profiles first (claimed), then CSV profiles (directory)
      const allProfiles = [...claimedProfiles, ...csvProfiles];
      
      // Apply client-side filtering for CSV data if needed
      let filteredProfiles = allProfiles;
      
      if (options.searchTerm && !this.isConnected) {
        filteredProfiles = allProfiles.filter(profile =>
          profile.business_name?.toLowerCase().includes(options.searchTerm!.toLowerCase()) ||
          profile.owner_name?.toLowerCase().includes(options.searchTerm!.toLowerCase())
        );
      }
      
      if (options.city && !this.isConnected) {
        filteredProfiles = filteredProfiles.filter(profile => profile.city === options.city);
      }
      
      console.log(`📊 Retrieved ${filteredProfiles.length} profiles (${claimedProfiles.length} claimed + ${csvProfiles.length} directory)`);
      
      return { data: filteredProfiles, error: null };
    } catch (error) {
      console.error('❌ Error fetching barber profiles:', error);
      return { data: [], error };
    }
  }

  /**
   * Get a single barber profile by slug or ID
   */
  async getBarberProfile(identifier: string): Promise<{ data: ParsedBarberProfile | null; error: any }> {
    try {
      // First try database for claimed profiles
      if (this.isConnected) {
        try {
          const { data: dbBarber, error: dbError } = await this.supabase
            .from('barber_profiles')
            .select('*')
            .eq('slug', identifier)
            .maybeSingle();

          if (!dbError && dbBarber) {
            console.log('✅ Found barber profile in database:', dbBarber.business_name);
            return { data: dbBarber, error: null };
          }

          // Also try by ID if slug didn't work
          if (!dbBarber) {
            const { data: dbBarberById, error: dbErrorById } = await this.supabase
              .from('barber_profiles')
              .select('*')
              .eq('id', identifier)
              .maybeSingle();

            if (!dbErrorById && dbBarberById) {
              console.log('✅ Found barber profile by ID in database:', dbBarberById.business_name);
              return { data: dbBarberById, error: null };
            }
          }
        } catch (dbError) {
          console.warn('Database query failed, checking CSV:', dbError);
        }
      }

      // Fallback to CSV if not found in database or not connected
      if (isReservedSlug(identifier)) {
        console.log(`🚫 Reserved slug "${identifier}" requested but no database profile found`);
        return { data: null, error: { code: 'RESERVED_SLUG' } };
      }

      const csvProfiles = await this.loadCSVData();
      const foundProfile = csvProfiles.find(p => p.slug === identifier || p.id === identifier);

      if (foundProfile) {
        console.log('📋 Found barber profile in CSV:', foundProfile.business_name);
      }

      return { data: foundProfile || null, error: foundProfile ? null : { code: 'NOT_FOUND' } };
    } catch (error) {
      console.error('❌ Error fetching barber profile:', error);
      return { data: null, error };
    }
  }

  /**
   * Get the total count of barber profiles
   */
  async getBarberCount(): Promise<number> {
    try {
      let dbCount = 0;
      
      if (this.isConnected) {
        try {
          const { data, error } = await this.supabase
            .from('barber_profiles')
            .select('id', { count: 'exact', head: true });
          
          if (!error && data) {
            dbCount = data.length;
          }
        } catch (error) {
          console.warn('Database count query failed:', error);
        }
      }
      
      const csvProfiles = await this.loadCSVData();
      return dbCount + csvProfiles.length;
    } catch (error) {
      console.error('❌ Error getting barber count:', error);
      return 0;
    }
  }

  /**
   * Get unique cities from all barber profiles
   */
  async getUniqueCities(): Promise<string[]> {
    try {
      const { data: profiles } = await this.getBarberProfiles();
      const cities = [...new Set(profiles.map(p => p.city).filter(Boolean))] as string[];
      return cities.sort();
    } catch (error) {
      console.error('❌ Error getting unique cities:', error);
      return [];
    }
  }

  /**
   * Check if Supabase is connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get the underlying Supabase client (for direct access when needed)
   */
  getSupabaseClient() {
    return this.supabase;
  }
}

// Create singleton instance
export const barberDataService = new BarberDataService();