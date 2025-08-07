/*
  # Fix Messages RLS for Bidirectional Communication

  1. Updated Policies
    - Allow INSERT for authenticated users who are part of the booking (barber or client)
    - Allow SELECT for authenticated users who are part of the booking conversation
    - Allow UPDATE for receivers to mark messages as read
    - Ensure both barbers and clients can send and receive messages

  2. Security
    - Verify users are part of the actual booking before allowing message operations
    - Prevent unauthorized access to messages from unrelated bookings
    - Maintain sender verification for message integrity

  3. Changes
    - Drop existing restrictive policies
    - Create new policies that properly check booking participation
    - Enable full bidirectional messaging between barbers and clients
*/

-- Drop existing policies that may be too restrictive
DROP POLICY IF EXISTS "Users can read their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages as themselves" ON public.messages;
DROP POLICY IF EXISTS "Users can update read status of messages sent to them" ON public.messages;

-- Create new bidirectional messaging policies

-- Policy 1: Allow INSERT for users who are part of the booking
CREATE POLICY "Allow insert for booking participants" ON public.messages
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings
      WHERE id = booking_id
        AND (
          barber_id IN (SELECT id FROM barber_profiles WHERE user_id = auth.uid())
          OR client_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
        )
    )
  );

-- Policy 2: Allow SELECT for users who are sender, receiver, or part of the booking
CREATE POLICY "Allow select for booking participants" ON public.messages
  FOR SELECT 
  TO authenticated
  USING (
    (sender_id = auth.uid() OR receiver_id = auth.uid()) AND
    EXISTS (
      SELECT 1 FROM bookings
      WHERE id = booking_id
        AND (
          barber_id IN (SELECT id FROM barber_profiles WHERE user_id = auth.uid())
          OR client_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
        )
    )
  );

-- Policy 3: Allow UPDATE for receivers to mark messages as read
CREATE POLICY "Allow update read status by receiver" ON public.messages
  FOR UPDATE 
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Policy 4: Allow DELETE for message senders (optional - for message deletion)
CREATE POLICY "Allow delete by sender" ON public.messages
  FOR DELETE 
  TO authenticated
  USING (sender_id = auth.uid());

-- Ensure RLS is enabled on the messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;