/*
  # AI Chat System Tables

  1. New Tables
    - `knowledge_base`
      - `id` (uuid, primary key)
      - `title` (text)
      - `content` (text)
      - `category` (text)
      - `embedding` (vector)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `chat_conversations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable)
      - `session_id` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `chat_messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid)
      - `role` (text)
      - `content` (text)
      - `context_used` (jsonb)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for user access
    
  3. Functions
    - Add vector similarity search function for knowledge base
*/

-- Enable the vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base table for AI chat responses
CREATE TABLE IF NOT EXISTS knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  embedding vector(1536), -- OpenAI ada-002 embedding size
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Chat conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES chat_conversations(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  context_used jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_base (public read)
CREATE POLICY "Knowledge base is viewable by everyone"
  ON knowledge_base
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage knowledge base"
  ON knowledge_base
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for chat_conversations
CREATE POLICY "Users can view own conversations"
  ON chat_conversations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can create conversations"
  ON chat_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Anonymous users can create conversations"
  ON chat_conversations
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages from own conversations"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM chat_conversations 
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM chat_conversations 
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

CREATE POLICY "Anonymous users can create messages"
  ON chat_messages
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_created_at ON knowledge_base(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_session_id ON chat_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Vector similarity search function for knowledge base
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  category text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.category,
    1 - (kb.embedding <=> query_embedding) as similarity
  FROM knowledge_base kb
  WHERE kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Insert initial knowledge base content about Kutable
INSERT INTO knowledge_base (title, content, category) VALUES
(
  'What is Kutable?',
  'Kutable is a professional barber booking platform that connects customers with barbers. Customers can find and book barbers online, while barbers can claim profiles, manage bookings, and accept payments. The platform is mobile-first with SMS confirmations and reminders included.',
  'general'
),
(
  'How to Book an Appointment',
  'To book an appointment: 1) Browse our barber directory and find a barber you like, 2) Select a service and available time slot, 3) Complete booking with secure payment, 4) Receive instant SMS confirmation. You''ll also get a reminder 24 hours before your appointment.',
  'booking'
),
(
  'Cancellation and Rescheduling',
  'You can cancel appointments up to 24 hours in advance directly from your dashboard for a full refund. For rescheduling or cancellations within 24 hours, please contact your barber directly using their phone number on their profile.',
  'booking'
),
(
  'Payment and Pricing for Customers',
  'Payments are processed securely through Stripe when you book. There are no additional booking fees for customers. You pay the service price set by the barber. All payments are secure and encrypted.',
  'payment'
),
(
  'For Barbers - How to Get Started',
  'Barbers can find their business in our directory and claim it for free. After claiming, you can set your services, pricing, availability, and connect your bank account to start accepting online payments. No monthly fees or setup costs.',
  'barber'
),
(
  'Barber Fees and Earnings',
  'Barbers pay only when they earn - there''s a 4% total fee per transaction which includes 1% platform fee and approximately 3% payment processing fee. No monthly subscriptions, setup fees, or contracts. Money goes directly to your bank account.',
  'barber'
),
(
  'SMS Notifications',
  'After booking, you''ll receive SMS confirmations and 24-hour reminders. You can opt out anytime by replying STOP to any message. Make sure to provide a valid phone number during booking to receive notifications.',
  'technical'
),
(
  'Account Creation and Profiles',
  'Creating an account is free and takes just a minute. You need an account to book appointments and manage your booking history. For barbers, claiming a profile allows you to start accepting online bookings and payments.',
  'general'
),
(
  'Finding Barbers Near You',
  'Browse our verified directory of professional barbers. You can filter by location, rating, services, and availability. All barbers show reviews from real customers and you can see their portfolios and pricing.',
  'general'
),
(
  'Support and Help',
  'For platform and technical issues, email support@kutable.com. For appointment questions (changes, directions, etc.), contact your barber directly using their phone number on their profile. We respond to support emails within 24 hours.',
  'support'
),
(
  'Privacy and Security',
  'Your data is secure with bank-level encryption. We never sell your information and only use it to provide services. You can manage your communication preferences in your dashboard and opt out of marketing while keeping essential booking notifications.',
  'privacy'
),
(
  'Mobile Experience',
  'Kutable is designed mobile-first. Everything works perfectly on phones, tablets, and desktops. Barbers can share their profile links anywhere and customers can book easily from any device.',
  'technical'
),
(
  'Claiming Your Barber Profile',
  'If you''re a barber and see your business listed, click ''Claim This Listing'' on your profile page. You''ll need to verify your identity and connect a bank account to start accepting online payments and managing bookings.',
  'barber'
),
(
  'Setting Up Payment Processing',
  'Barbers need to connect their bank account through Stripe to accept online payments. This is secure and takes just a few minutes. Once connected, you''ll receive payments automatically when customers book.',
  'barber'
),
(
  'Booking Policies and Rules',
  'Customers can cancel up to 24 hours before their appointment for a full refund. Late cancellations or no-shows may result in charges. Barbers set their own cancellation policies and should honor confirmed bookings.',
  'booking'
);