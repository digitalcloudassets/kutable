/*
  # Kutable Barber Platform - Initial Database Schema

  1. New Tables
    - `barber_profiles` - Store barber information and claimed status
    - `services` - Barber services with pricing and duration
    - `bookings` - Customer appointments and payments
    - `clients` - Customer profiles and preferences
    - `gallery_media` - Images and videos for barber galleries
    - `availability` - Barber working hours and time slots
    - `reviews` - Customer reviews and ratings
    - `stripe_accounts` - Stripe Connect account metadata
    - `platform_transactions` - Track platform fees and revenue

  2. Security
    - Enable RLS on all tables
    - Add policies for barbers, clients, and platform admin
    - Secure payment and financial data access

  3. Storage
    - Create buckets for gallery media uploads
    - Set up proper access policies for media files
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Barber profiles table
CREATE TABLE IF NOT EXISTS barber_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  owner_name text NOT NULL,
  phone text,
  email text,
  address text,
  city text,
  state text,
  zip_code text,
  bio text,
  profile_image_url text,
  is_claimed boolean DEFAULT false,
  is_active boolean DEFAULT false,
  stripe_account_id text,
  stripe_onboarding_completed boolean DEFAULT false,
  average_rating decimal(3,2) DEFAULT 0,
  total_reviews integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid REFERENCES barber_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  duration_minutes integer NOT NULL,
  deposit_required boolean DEFAULT false,
  deposit_amount decimal(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Client profiles table
CREATE TABLE IF NOT EXISTS client_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  email text,
  preferred_contact text DEFAULT 'sms',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid REFERENCES barber_profiles(id) ON DELETE CASCADE,
  client_id uuid REFERENCES client_profiles(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  status text DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'refund_requested')),
  total_amount decimal(10,2) NOT NULL,
  deposit_amount decimal(10,2) DEFAULT 0,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  platform_fee decimal(10,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Availability table
CREATE TABLE IF NOT EXISTS availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid REFERENCES barber_profiles(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Gallery media table
CREATE TABLE IF NOT EXISTS gallery_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid REFERENCES barber_profiles(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('image', 'video')),
  caption text,
  is_featured boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid REFERENCES barber_profiles(id) ON DELETE CASCADE,
  client_id uuid REFERENCES client_profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

-- Stripe accounts table
CREATE TABLE IF NOT EXISTS stripe_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid REFERENCES barber_profiles(id) ON DELETE CASCADE,
  stripe_account_id text UNIQUE NOT NULL,
  account_status text DEFAULT 'pending',
  charges_enabled boolean DEFAULT false,
  payouts_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Platform transactions table
CREATE TABLE IF NOT EXISTS platform_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  barber_id uuid REFERENCES barber_profiles(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('booking', 'refund', 'payout')),
  gross_amount decimal(10,2) NOT NULL,
  platform_fee decimal(10,2) NOT NULL,
  stripe_fee decimal(10,2) NOT NULL,
  net_amount decimal(10,2) NOT NULL,
  stripe_transaction_id text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE barber_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for barber_profiles
CREATE POLICY "Public barber profiles are viewable by everyone"
  ON barber_profiles FOR SELECT
  USING (true);

CREATE POLICY "Barbers can update own profile"
  ON barber_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Barbers can insert own profile"
  ON barber_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for services
CREATE POLICY "Public services are viewable by everyone"
  ON services FOR SELECT
  USING (true);

CREATE POLICY "Barbers can manage own services"
  ON services FOR ALL
  TO authenticated
  USING (barber_id IN (SELECT id FROM barber_profiles WHERE user_id = auth.uid()));

-- RLS Policies for client_profiles
CREATE POLICY "Clients can view and manage own profile"
  ON client_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for bookings
CREATE POLICY "Barbers can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (barber_id IN (SELECT id FROM barber_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Clients can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (client_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Clients can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (client_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Barbers can update booking status"
  ON bookings FOR UPDATE
  TO authenticated
  USING (barber_id IN (SELECT id FROM barber_profiles WHERE user_id = auth.uid()));

-- RLS Policies for availability
CREATE POLICY "Public availability is viewable by everyone"
  ON availability FOR SELECT
  USING (true);

CREATE POLICY "Barbers can manage own availability"
  ON availability FOR ALL
  TO authenticated
  USING (barber_id IN (SELECT id FROM barber_profiles WHERE user_id = auth.uid()));

-- RLS Policies for gallery_media
CREATE POLICY "Public gallery media is viewable by everyone"
  ON gallery_media FOR SELECT
  USING (true);

CREATE POLICY "Barbers can manage own gallery"
  ON gallery_media FOR ALL
  TO authenticated
  USING (barber_id IN (SELECT id FROM barber_profiles WHERE user_id = auth.uid()));

-- RLS Policies for reviews
CREATE POLICY "Public reviews are viewable by everyone"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Clients can create reviews for their bookings"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (client_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()));

-- RLS Policies for stripe_accounts
CREATE POLICY "Barbers can view own stripe account"
  ON stripe_accounts FOR SELECT
  TO authenticated
  USING (barber_id IN (SELECT id FROM barber_profiles WHERE user_id = auth.uid()));

-- RLS Policies for platform_transactions
CREATE POLICY "Barbers can view own transactions"
  ON platform_transactions FOR SELECT
  TO authenticated
  USING (barber_id IN (SELECT id FROM barber_profiles WHERE user_id = auth.uid()));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_barber_profiles_user_id ON barber_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_barber_profiles_is_claimed ON barber_profiles(is_claimed);
CREATE INDEX IF NOT EXISTS idx_services_barber_id ON services(barber_id);
CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON bookings(barber_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_appointment_date ON bookings(appointment_date);
CREATE INDEX IF NOT EXISTS idx_availability_barber_id ON availability(barber_id);
CREATE INDEX IF NOT EXISTS idx_gallery_media_barber_id ON gallery_media(barber_id);
CREATE INDEX IF NOT EXISTS idx_reviews_barber_id ON reviews(barber_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery-media', 'gallery-media', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-images', 'profile-images', true);

-- Storage policies
CREATE POLICY "Gallery media is publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery-media');

CREATE POLICY "Profile images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

CREATE POLICY "Authenticated users can upload gallery media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'gallery-media');

CREATE POLICY "Authenticated users can upload profile images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'profile-images');