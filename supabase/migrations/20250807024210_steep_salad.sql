/*
  # Add support requests table

  1. New Tables
    - `support_requests`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `email` (text, required)
      - `category` (text, required)
      - `subject` (text, required)
      - `message` (text, required)
      - `status` (text, default 'open')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `support_requests` table
    - Add policy for authenticated users to insert their own requests
    - Add policy for admins to read all requests
*/

-- Create support_requests table
CREATE TABLE IF NOT EXISTS support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  category text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'open',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- Policy for anyone to insert support requests
CREATE POLICY "Anyone can create support requests"
  ON support_requests
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy for users to read their own requests
CREATE POLICY "Users can read own support requests"
  ON support_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_requests_created_at 
  ON support_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_requests_status 
  ON support_requests (status);

CREATE INDEX IF NOT EXISTS idx_support_requests_category 
  ON support_requests (category);