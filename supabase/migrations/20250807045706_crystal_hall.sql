/*
  # Create In-App Messaging System

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `booking_id` (uuid, foreign key to bookings)
      - `sender_id` (uuid, foreign key to users via auth.users)
      - `receiver_id` (uuid, foreign key to users via auth.users)
      - `message_text` (text, max 1000 chars)
      - `read_at` (timestamp, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `messages` table
    - Users can only see messages where they are sender or receiver
    - Users can only send messages for bookings they're involved in
    - Messages are scoped to specific bookings only

  3. Indexes
    - Index on booking_id for fast conversation loading
    - Index on sender_id and receiver_id
    - Index on created_at for message ordering
    - Index on read_at for unread message counts
*/

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_text text NOT NULL CHECK (char_length(message_text) > 0 AND char_length(message_text) <= 1000),
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(booking_id, created_at DESC);

-- RLS Policies
CREATE POLICY "Users can view messages they sent or received"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

CREATE POLICY "Users can insert messages for their bookings only"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN barber_profiles bp ON b.barber_id = bp.id
      JOIN client_profiles cp ON b.client_id = cp.id
      WHERE b.id = booking_id
      AND (
        (bp.user_id = auth.uid() AND receiver_id = cp.user_id) OR
        (cp.user_id = auth.uid() AND receiver_id = bp.user_id)
      )
    )
  );

CREATE POLICY "Users can update read status of messages sent to them"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS messages_updated_at_trigger ON messages;
CREATE TRIGGER messages_updated_at_trigger
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();