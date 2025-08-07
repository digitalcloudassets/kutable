/*
  # Create AI Chat Tables

  1. New Tables
    - `chat_conversations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users table)
      - `session_id` (text for anonymous sessions)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `chat_messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, foreign key to chat_conversations)
      - `role` (text: 'user' or 'assistant')
      - `content` (text)
      - `context_used` (jsonb for storing sources/context)
      - `created_at` (timestamp)
    - `knowledge_base`
      - `id` (uuid, primary key)
      - `title` (text)
      - `content` (text)
      - `embedding` (vector for similarity search)
      - `category` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for user access control
    - Public read access for knowledge base

  3. Functions
    - Add vector similarity search function for knowledge base matching
*/

-- Create vector extension if not exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Create chat_conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  session_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES chat_conversations(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  context_used jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create knowledge_base table
CREATE TABLE IF NOT EXISTS knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Chat conversations policies
CREATE POLICY "Users can create conversations"
  ON chat_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own conversations"
  ON chat_conversations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Anonymous can create conversations"
  ON chat_conversations
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Anonymous can view own conversations"
  ON chat_conversations
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- Chat messages policies
CREATE POLICY "Users can create messages in their conversations"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM chat_conversations 
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

CREATE POLICY "Users can view messages in their conversations"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM chat_conversations 
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

CREATE POLICY "Anonymous can create messages"
  ON chat_messages
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous can view messages"
  ON chat_messages
  FOR SELECT
  TO anon
  USING (true);

-- Knowledge base policies
CREATE POLICY "Anyone can read knowledge base"
  ON knowledge_base
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage knowledge base"
  ON knowledge_base
  FOR ALL
  TO service_role
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_session_id ON chat_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);

-- Create vector similarity search function
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  category text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_base.id,
    knowledge_base.title,
    knowledge_base.content,
    knowledge_base.category,
    1 - (knowledge_base.embedding <=> query_embedding) AS similarity
  FROM knowledge_base
  WHERE 1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_base.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Insert initial knowledge base entries
INSERT INTO knowledge_base (title, content, category) VALUES
('What is Kutable', 'Kutable is a professional barber booking platform that connects customers with barbers. Customers can find and book barbers online, while barbers can claim profiles, manage bookings, and accept payments. The platform is mobile-first with SMS confirmations and reminders included.', 'general'),

('How to Book Appointments', 'To book an appointment: 1) Browse our barber directory and find a barber you like, 2) Select a service and available time slot, 3) Complete booking with secure payment, 4) Receive instant SMS confirmation. You will also get a reminder 24 hours before your appointment.', 'booking'),

('Canceling and Rescheduling', 'You can cancel appointments up to 24 hours in advance directly from your dashboard for a full refund. For rescheduling or cancellations within 24 hours, please contact your barber directly using their phone number on their profile.', 'booking'),

('Payment and Pricing for Customers', 'Payments are processed securely through Stripe when you book. There are no additional booking fees for customers. You pay the service price set by the barber. All payments are secure and encrypted.', 'payment'),

('Barber Fees and Pricing', 'Barbers pay only when they earn - there is a 4% total fee per transaction which includes 1% platform fee and approximately 3% payment processing fee. No monthly subscriptions, setup fees, or contracts. Money goes directly to your bank account.', 'barber'),

('How to Claim Your Barber Profile', 'Barbers can find their business in our directory and claim it for free. After claiming, you can set your services, pricing, availability, and connect your bank account to start accepting online payments. No monthly fees or setup costs.', 'barber'),

('SMS Notifications', 'After booking, you will receive SMS confirmations and 24-hour reminders. You can opt out anytime by replying STOP to any message. Make sure to provide a valid phone number during booking to receive notifications.', 'notifications'),

('Getting Support', 'For platform and technical issues, email support@kutable.com. For appointment questions (changes, directions, etc.), contact your barber directly using their phone number on their profile. We respond to support emails within 24 hours.', 'support'),

('Privacy and Security', 'Your data is secure with bank-level encryption. We never sell your information and only use it to provide services. You can manage your communication preferences in your dashboard.', 'privacy'),

('Finding Barbers', 'Browse our verified directory of professional barbers. You can filter by location, rating, services, and availability. All barbers show reviews from real customers and you can see their portfolios and pricing.', 'search'),

('Mobile App and Sharing', 'Kutable is designed mobile-first. Barbers can easily share their profile links with customers. The platform works seamlessly on all devices - phones, tablets, and desktop.', 'mobile'),

('Barber Dashboard Features', 'Barbers get a comprehensive dashboard to manage bookings, set availability, upload portfolio photos, track earnings, and communicate with customers. Everything needed to run a successful barber business online.', 'barber'),

('Customer Reviews and Ratings', 'Customers can leave reviews and ratings after appointments. This helps other customers find great barbers and helps barbers build their reputation. All reviews are from verified bookings.', 'reviews'),

('Payment Processing and Payouts', 'Barbers receive payments directly to their bank account. Payments are processed immediately when customers book. Stripe handles all payment processing securely. No waiting periods for payouts.', 'payment'),

('Platform Benefits', 'Kutable eliminates the hassle of phone bookings, reduces no-shows with SMS reminders, provides secure payment processing, and helps barbers grow their business with online presence and customer reviews.', 'benefits')
ON CONFLICT (title) DO NOTHING;