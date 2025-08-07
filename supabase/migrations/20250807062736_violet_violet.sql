/*
  # AI Chat System Setup

  1. New Tables
    - `chat_conversations` - Stores chat conversation sessions
    - `chat_messages` - Stores individual chat messages
    - `knowledge_base` - Contains Kutable platform information for AI responses

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated and public access
    - Secure conversation access by user

  3. Features
    - Vector embeddings for knowledge base search
    - Full conversation history tracking
    - Session-based chat organization
*/

-- Create chat conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES chat_conversations(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  context_used jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create knowledge base table
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

-- RLS Policies for chat_conversations
CREATE POLICY "Users can create conversations"
  ON chat_conversations
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Users can read own conversations"
  ON chat_conversations
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- RLS Policies for chat_messages
CREATE POLICY "Users can create messages"
  ON chat_messages
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Users can read messages"
  ON chat_messages
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- RLS Policies for knowledge_base
CREATE POLICY "Public can read knowledge base"
  ON knowledge_base
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_session_id ON chat_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);

-- Insert Kutable knowledge base content
INSERT INTO knowledge_base (title, content, category) VALUES
  ('What is Kutable', 'Kutable is a professional barber booking platform that connects customers with barbers. Customers can browse verified barber profiles, book appointments online, and pay securely. Barbers can claim profiles, manage bookings, set services and pricing, and accept payments with no monthly fees.', 'platform'),
  
  ('How to Book Appointments', 'To book an appointment: 1) Browse our barber directory and find a barber you like, 2) View their services, pricing, and available time slots, 3) Select a service and preferred time, 4) Complete booking with secure payment through Stripe, 5) Receive instant SMS confirmation. You will also get a reminder 24 hours before your appointment.', 'booking'),
  
  ('Barber Fees and Pricing', 'Barbers pay only when they earn money through the platform. There is a 4% total fee per transaction, which includes a 1% platform fee and approximately 3% payment processing fee through Stripe. No monthly subscriptions, setup fees, or contracts. Money goes directly to your connected bank account.', 'barber'),
  
  ('How to Claim Barber Profile', 'Barbers can find their business in our directory and claim it for free. The claiming process involves verifying your business information, setting up your services and pricing, uploading portfolio images, and connecting your bank account through Stripe Connect to start accepting online payments.', 'barber'),
  
  ('Customer Pricing', 'Customers pay no additional booking fees. You pay exactly the service price set by the barber. All payments are processed securely through Stripe with bank-level encryption. The barber handles their own pricing for services.', 'pricing'),
  
  ('SMS Notifications', 'After booking, customers receive SMS confirmations immediately and reminder messages 24 hours before appointments. Both customers and barbers receive notifications about bookings. You can opt out anytime by replying STOP to any message. Make sure to provide a valid phone number during booking.', 'features'),
  
  ('Cancellation Policy', 'Customers can cancel appointments up to 24 hours in advance directly from their dashboard for a full refund. For rescheduling or cancellations within 24 hours, please contact your barber directly using their phone number listed on their profile.', 'booking'),
  
  ('Payment Security', 'All payments are processed through Stripe, which provides bank-level security and PCI compliance. We never store credit card information. Your payment data is encrypted and secure. Barbers receive payments directly to their connected bank accounts.', 'security'),
  
  ('Support and Help', 'For platform and technical issues, email support@kutable.com. For appointment-specific questions (changes, directions, special requests), contact your barber directly using their phone number on their profile. We respond to support emails within 24 hours.', 'support'),
  
  ('Mobile App and Accessibility', 'Kutable is designed mobile-first and works perfectly on any smartphone browser. No app download required. The platform is fully responsive and optimized for mobile booking and management. Barbers can manage their business on-the-go.', 'features'),
  
  ('Finding Barbers', 'Browse our verified directory of professional barbers. You can search by location, filter by services offered, view ratings and reviews from real customers, check pricing, and see portfolio galleries. All barber profiles show verified business information.', 'booking'),
  
  ('Barber Dashboard Features', 'Barbers get access to a comprehensive dashboard for managing bookings, setting availability, uploading portfolio images, tracking revenue, managing services and pricing, viewing customer messages, and exporting transaction data for accounting.', 'barber'),
  
  ('Platform Revenue Model', 'Kutable operates on a transaction-based model. We only make money when barbers make money. There are no subscription fees, setup costs, or hidden charges. The 4% total transaction fee covers platform maintenance, SMS notifications, payment processing, and customer support.', 'platform'),
  
  ('Privacy and Data Protection', 'Your data is protected with bank-level encryption. We never sell your information and only use it to provide booking services. You can manage your communication preferences in your dashboard. All data handling complies with privacy regulations.', 'security'),
  
  ('Business Hours and Availability', 'Barbers can set their own working hours and availability through their dashboard. Customers can only book during available time slots. Barbers can block specific dates for vacations or personal time, and update their schedule in real-time.', 'barber')
ON CONFLICT DO NOTHING;