import { createClient } from '@supabase/supabase-js';
import { barberDataService } from '../shared/services/barberDataService';

// Use the centralized barber data service
export const supabase = barberDataService.getSupabaseClient();

export const getRealBarberCount = async (): Promise<number> => {
  return await barberDataService.getBarberCount();
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
    };
  };
};