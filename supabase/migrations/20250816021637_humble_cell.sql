/*
  # Fix RLS Recursion and Restore Messaging

  This migration fixes the 42P17 RLS recursion error by replacing recursive policies
  with clean, non-recursive party-based policies.

  ## Changes Made

  1. **Drop Existing Policies**
     - Remove all existing policies from `bookings` and `messages` tables
     - These policies were causing infinite recursion

  2. **New Bookings Policies**
     - `bookings_select_party`: Users can read bookings where they are client_id OR barber_id
     - `bookings_insert_party`: Users can insert bookings where they are listed as a party
     - `bookings_update_party`: Users can update bookings where they are a party

  3. **New Messages Policies**
     - `messages_select_party`: Users can read messages if they are sender/receiver OR party to the booking
     - `messages_insert_party`: Users can send messages to bookings they're involved in
     - `messages_update_party`: Users can update messages for bookings they're involved in

  ## Security Benefits
  - Non-recursive policies eliminate infinite loops
  - Party-based access ensures proper data isolation
  - Messages can safely reference bookings (bookings policies are now clean)
  - Restores unread counts and conversation functionality
*/

-- 0) Safety: make sure RLS is enabled (do not disable globally)
alter table public.bookings enable row level security;
alter table public.messages enable row level security;

-- 1) Drop existing policies on bookings/messages (names unknown)
do $$
declare
  p record;
begin
  for p in 
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and tablename in ('bookings','messages')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end$$;

-- 2) Recreate CLEAN, NON-RECURSIVE bookings policies
-- Read: either party can see the booking
create policy bookings_select_party
on public.bookings
for select
using (
  auth.uid() = client_id
  or auth.uid() = barber_id
);

-- Insert: only if the inserting user is a party on the row they insert
create policy bookings_insert_party
on public.bookings
for insert
with check (
  auth.uid() = client_id
  or auth.uid() = barber_id
);

-- Update: only if the updating user is a party on that row
create policy bookings_update_party
on public.bookings
for update
using (
  auth.uid() = client_id
  or auth.uid() = barber_id
)
with check (
  auth.uid() = client_id
  or auth.uid() = barber_id
);

-- (Optional) Delete: usually not allowed; add if you want parties to delete
-- create policy bookings_delete_party
-- on public.bookings
-- for delete
-- using (auth.uid() = client_id or auth.uid() = barber_id);

-- 3) Recreate messages policies (may reference bookings—but bookings policy is non-recursive now)
-- Read: sender/receiver OR either party of the booking
create policy messages_select_party
on public.messages
for select
using (
  sender_id = auth.uid()
  or receiver_id = auth.uid()
  or exists (
    select 1
    from public.bookings b
    where b.id = messages.booking_id
      and (b.client_id = auth.uid() or b.barber_id = auth.uid())
  )
);

-- Insert: only if the current user is part of the linked booking (or sending to self party)
create policy messages_insert_party
on public.messages
for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.bookings b
    where b.id = messages.booking_id
      and (b.client_id = auth.uid() or b.barber_id = auth.uid())
  )
);

-- Update (e.g., marking read): either party on the booking (or the receiver) can update
create policy messages_update_party
on public.messages
for update
using (
  sender_id = auth.uid()
  or receiver_id = auth.uid()
  or exists (
    select 1
    from public.bookings b
    where b.id = messages.booking_id
      and (b.client_id = auth.uid() or b.barber_id = auth.uid())
  )
)
with check (
  sender_id = auth.uid()
  or receiver_id = auth.uid()
  or exists (
    select 1
    from public.bookings b
    where b.id = messages.booking_id
      and (b.client_id = auth.uid() or b.barber_id = auth.uid())
  )
);