import { createClient } from '@supabase/supabase-js';
import { env } from './env';

const supabaseUrl = env.supabaseUrl;
const supabaseAnonKey = env.supabaseAnonKey;

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

let supabase: any;

if (!hasValidCredentials) {
  console.info('📁 Supabase not connected - using fallback mode');
  
  // Create fallback client
  supabase = {
    from: (table: string) => {
      if (table === 'barber_profiles') {
        return {
          select: () => ({ 
            then: (resolve: any) => resolve({ data: [], error: null }),
            single: () => Promise.resolve({ data: null, error: { message: 'Connect to Supabase for barber profiles' } }),
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            eq: () => ({ 
              then: (resolve: any) => resolve({ data: [], error: null }),
              single: () => Promise.resolve({ data: null, error: { message: 'Connect to Supabase for barber profiles' } }),
              maybeSingle: () => Promise.resolve({ data: null, error: null })
            }),
            order: () => ({ 
              then: (resolve: any) => resolve({ data: [], error: null })
            })
          })
        };
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