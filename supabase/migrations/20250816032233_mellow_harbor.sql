/*
  # Fix RLS recursion on bookings and messages tables

  1. Database Changes
    - Drop recursive policies causing 42P17 errors
    - Create clean party-based policies for bookings
    - Create safe message policies that reference non-recursive bookings
    - Add index for unread message lookups

  2. Security
    - Enable RLS on both tables
    - Party-based access (client_id or barber_id)
    - No self-referential policies
    - Safe cross-table references from messages to bookings
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

-- 4) Optional index for unread message lookups (performance optimization)
create index if not exists idx_messages_receiver_unread 
on public.messages (receiver_id) 
where read_at is null;

-- 5) Additional indexes for common query patterns
create index if not exists idx_messages_booking_created 
on public.messages (booking_id, created_at desc);

create index if not exists idx_bookings_parties 
on public.bookings (client_id, barber_id);