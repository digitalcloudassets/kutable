/*
  # Email notifications tracking system

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `channel` (enum: email)
      - `template` (text, template identifier)
      - `to_email` (text, recipient email)
      - `to_user_id` (uuid, optional user reference)
      - `subject` (text, email subject)
      - `html` (text, email content)
      - `meta` (jsonb, additional data)
      - `provider_message_id` (text, Resend message ID)
      - `attempts` (int, retry count)
      - `status` (enum: queued, sending, delivered, bounced, complained, failed)
      - `last_error` (text, error message if failed)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Enums
    - `notification_channel` for supported channels
    - `notification_status` for tracking delivery states

  3. Security
    - Enable RLS on `notifications` table
    - Add policy for service role access only
    - Add indexes for performance
*/

-- Create notification enums
CREATE TYPE IF NOT EXISTS notification_channel AS ENUM ('email');
CREATE TYPE IF NOT EXISTS notification_status AS ENUM ('queued','sending','delivered','bounced','complained','failed');

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel notification_channel NOT NULL DEFAULT 'email',
  template text NOT NULL,
  to_email text NOT NULL,
  to_user_id uuid,
  subject text NOT NULL,
  html text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  provider_message_id text,
  attempts int NOT NULL DEFAULT 0,
  status notification_status NOT NULL DEFAULT 'queued',
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_provider_message_id ON notifications(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_to_user_id ON notifications(to_user_id) WHERE to_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_retry_eligible ON notifications(status, attempts, updated_at) WHERE status IN ('failed', 'queued') AND attempts < 3;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access notifications
CREATE POLICY "Service role can manage notifications"
  ON notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);