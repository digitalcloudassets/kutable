/*
  # Fix Messages Table RLS for Bidirectional Messaging

  This migration ensures proper Row Level Security policies for bidirectional messaging 
  between barbers and clients while maintaining security.

  ## Changes Made

  1. **Dropped and Recreated RLS Policies**
     - Removed old policies that may have had syntax or logic issues
     - Created new, cleaner policies with better structure

  2. **New Policies**
     - `messages_insert_policy`: Allow authenticated users to insert messages if they are the sender and part of the booking
     - `messages_select_policy`: Allow users to read messages if they are sender/receiver and part of the booking
     - `messages_update_policy`: Allow receivers to mark messages as read
     - `messages_delete_policy`: Allow senders to delete their own messages

  3. **Security Features**
     - Only booking participants can send/receive messages
     - Users can only see conversations they're part of
     - Message content is protected from unauthorized access
     - Maintains audit trail for sent messages
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow delete by sender" ON public.messages;
DROP POLICY IF EXISTS "Allow insert for booking participants" ON public.messages;
DROP POLICY IF EXISTS "Allow select for booking participants" ON public.messages;
DROP POLICY IF EXISTS "Allow update read status by receiver" ON public.messages;

-- Create new, cleaner RLS policies for bidirectional messaging

-- 1. INSERT Policy: Allow users to send messages if they are part of the booking
CREATE POLICY "messages_insert_policy"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = messages.booking_id
    AND (
      -- User is the barber in this booking
      bookings.barber_id IN (
        SELECT barber_profiles.id 
        FROM public.barber_profiles 
        WHERE barber_profiles.user_id = auth.uid()
      )
      OR
      -- User is the client in this booking
      bookings.client_id IN (
        SELECT client_profiles.id 
        FROM public.client_profiles 
        WHERE client_profiles.user_id = auth.uid()
      )
    )
  )
);

-- 2. SELECT Policy: Allow users to read messages if they are sender/receiver and part of booking
CREATE POLICY "messages_select_policy"
ON public.messages
FOR SELECT
TO authenticated
USING (
  (sender_id = auth.uid() OR receiver_id = auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = messages.booking_id
    AND (
      -- User is the barber in this booking
      bookings.barber_id IN (
        SELECT barber_profiles.id 
        FROM public.barber_profiles 
        WHERE barber_profiles.user_id = auth.uid()
      )
      OR
      -- User is the client in this booking
      bookings.client_id IN (
        SELECT client_profiles.id 
        FROM public.client_profiles 
        WHERE client_profiles.user_id = auth.uid()
      )
    )
  )
);

-- 3. UPDATE Policy: Allow receivers to mark messages as read
CREATE POLICY "messages_update_policy"
ON public.messages
FOR UPDATE
TO authenticated
USING (receiver_id = auth.uid())
WITH CHECK (receiver_id = auth.uid());

-- 4. DELETE Policy: Allow senders to delete their own messages
CREATE POLICY "messages_delete_policy"
ON public.messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- Ensure RLS is enabled on the messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Also ensure other related tables have proper RLS for messaging context

-- Ensure bookings table allows participants to read their bookings
DROP POLICY IF EXISTS "Barbers can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients can view own bookings" ON public.bookings;

CREATE POLICY "booking_participants_select_policy"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  -- User is the barber in this booking
  barber_id IN (
    SELECT barber_profiles.id 
    FROM public.barber_profiles 
    WHERE barber_profiles.user_id = auth.uid()
  )
  OR
  -- User is the client in this booking
  client_id IN (
    SELECT client_profiles.id 
    FROM public.client_profiles 
    WHERE client_profiles.user_id = auth.uid()
  )
);

-- Ensure profile tables allow users to read their own profiles for messaging
DROP POLICY IF EXISTS "Clients can view and manage own profile" ON public.client_profiles;

CREATE POLICY "client_profiles_own_policy"
ON public.client_profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Ensure barber profiles allow reading for messaging context
DROP POLICY IF EXISTS "Barbers can insert own profile" ON public.barber_profiles;
DROP POLICY IF EXISTS "Barbers can update own profile" ON public.barber_profiles;

CREATE POLICY "barber_profiles_own_policy"
ON public.barber_profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());