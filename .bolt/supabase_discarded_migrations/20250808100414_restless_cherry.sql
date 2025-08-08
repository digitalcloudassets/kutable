/*
  # Add payments table for Stripe payment tracking

  1. New Tables
    - `payments`
      - `id` (uuid, primary key)
      - `payment_intent_id` (text, unique) - Stripe PaymentIntent ID
      - `charge_id` (text) - Stripe Charge ID  
      - `session_id` (text) - Stripe Checkout Session ID
      - `booking_id` (uuid) - Link to bookings table
      - `barber_id` (uuid) - Link to barber for reporting
      - `user_id` (uuid) - Link to user who made payment
      - `amount` (integer) - Amount in cents
      - `currency` (text) - Currency code
      - `status` (text) - Payment status
      - `raw` (jsonb) - Raw Stripe object for debugging
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `payments` table
    - Add policies for barbers and clients to view their own payments
    
  3. Indexes
    - Index on payment_intent_id for webhook lookups
    - Index on booking_id for booking-payment joins
*/

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id text UNIQUE NOT NULL,
  charge_id text,
  session_id text,
  booking_id uuid,
  barber_id uuid,
  user_id uuid,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_intent_id ON payments(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_barber_id ON payments(barber_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Barbers can view payments for their bookings"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    barber_id IN (
      SELECT id FROM barber_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view their own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage all payments"
  ON payments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Foreign key constraints
ALTER TABLE payments 
ADD CONSTRAINT fk_payments_booking_id 
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

ALTER TABLE payments 
ADD CONSTRAINT fk_payments_barber_id 
FOREIGN KEY (barber_id) REFERENCES barber_profiles(id) ON DELETE CASCADE;

ALTER TABLE payments 
ADD CONSTRAINT fk_payments_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;