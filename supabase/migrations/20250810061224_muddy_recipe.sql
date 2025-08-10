/*
  # Create payments table for accurate revenue tracking

  1. New Tables
    - `payments`
      - `id` (uuid, primary key)
      - `booking_id` (uuid, references bookings)
      - `barber_id` (uuid, references barber_profiles)
      - `customer_id` (uuid, customer identifier)
      - `currency` (text, default 'usd')
      - `gross_amount_cents` (integer, total amount in cents)
      - `application_fee_cents` (integer, platform fee from Stripe)
      - `stripe_charge_id` (text, unique Stripe charge ID)
      - `livemode` (boolean, production vs test data)
      - `status` (text, payment status)
      - `created_at` (timestamptz, payment timestamp)

  2. Security
    - Enable RLS on `payments` table
    - Add policy for barbers to read their own payment data
    - Add policy for admins to read all payment data

  3. Indexes
    - Performance indexes for dashboard queries
    - Optimized for date range and status filtering
*/

-- Create payments table to store finalized booking payments from Stripe
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete set null,
  barber_id uuid references barber_profiles(id) on delete set null,
  customer_id uuid,
  currency text not null default 'usd',
  gross_amount_cents integer not null,              -- e.g., 500 for $5.00
  application_fee_cents integer not null default 0, -- platform fee from Stripe
  stripe_charge_id text unique,
  livemode boolean not null default false,
  status text not null check (status in ('succeeded','refunded','failed','pending')),
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table payments enable row level security;

-- Indexes for performance
create index if not exists idx_payments_created_at on payments(created_at);
create index if not exists idx_payments_status on payments(status);
create index if not exists idx_payments_livemode on payments(livemode);
create index if not exists idx_payments_barber on payments(barber_id);
create index if not exists idx_payments_booking on payments(booking_id);
create index if not exists idx_payments_stripe_charge on payments(stripe_charge_id);

-- RLS Policies
create policy "Barbers can read own payment data"
  on payments
  for select
  to authenticated
  using (
    barber_id in (
      select id from barber_profiles where user_id = auth.uid()
    )
  );

create policy "Admin can read all payment data"
  on payments
  for select
  to authenticated
  using (
    exists (
      select 1 from barber_profiles 
      where user_id = auth.uid() 
      and email = 'admin@kutable.com'
    )
  );

create policy "System can insert payment data"
  on payments
  for insert
  to service_role
  with check (true);

create policy "System can update payment data"
  on payments
  for update
  to service_role
  using (true);