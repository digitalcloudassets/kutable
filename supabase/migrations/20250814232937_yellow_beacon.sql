/*
  # Create rate limiting table for persistent rate limiting

  1. New Tables
    - `rate_limits`
      - `action` (text) - action being rate limited (e.g., 'send-sms', 'create-payment-intent')
      - `identifier` (text) - IP address or user identifier
      - `window_start` (timestamptz) - start of current rate limit window
      - `count` (integer) - number of requests in current window
      - `created_at` (timestamptz) - when record was created
      - `updated_at` (timestamptz) - when record was last updated

  2. Functions
    - `rl_consume` - atomically increment rate limit counter and return current count

  3. Indexes
    - Composite index on (action, identifier) for fast lookups
    - Index on window_start for cleanup queries

  4. Security
    - Enable RLS on rate_limits table
    - Only service role can access (no user policies needed)
*/

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  action text NOT NULL,
  identifier text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (action, identifier)
);

-- Enable RLS (service role only access)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits (window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_action ON rate_limits (action);

-- Create atomic rate limit consumption function
CREATE OR REPLACE FUNCTION rl_consume(
  _action text,
  _identifier text,
  _window_seconds integer
) RETURNS integer AS $$
DECLARE
  current_window timestamptz;
  current_count integer;
BEGIN
  -- Calculate current window start (rounded down to window boundaries)
  current_window := date_trunc('minute', now()) - 
    (EXTRACT(EPOCH FROM date_trunc('minute', now()) - date_trunc('hour', now())) % _window_seconds) * INTERVAL '1 second';

  -- Upsert and return the count atomically
  INSERT INTO rate_limits (action, identifier, window_start, count, created_at, updated_at)
  VALUES (_action, _identifier, current_window, 1, now(), now())
  ON CONFLICT (action, identifier) DO UPDATE SET
    count = CASE 
      WHEN rate_limits.window_start = current_window THEN rate_limits.count + 1
      ELSE 1
    END,
    window_start = current_window,
    updated_at = now()
  RETURNING count INTO current_count;

  RETURN current_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION rl_consume(text, text, integer) TO service_role;

-- Cleanup function to remove old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits() RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits 
  WHERE window_start < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission for cleanup
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limits() TO service_role;