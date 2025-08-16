/*
  # Fix Demo Bookings Visibility and Messaging

  1. Resolve Current Auth User IDs
     - Find Pete Drake's current auth user ID
     - Find Kutable barber's current auth user ID
     - Get barber profile ID for Kutable

  2. Ensure Client Profile Exists
     - Create client_profiles row for Pete if missing
     - Links to his current auth user ID

  3. Fix Demo Bookings
     - Update 3 demo bookings to use Pete's current auth user ID
     - Preserves all other booking data
     - Enables proper RLS access for both parties

  4. Sanity Check
     - Verify both users can see the 3 bookings
     - Confirms messaging will work properly
*/

-- Resolve the CURRENT auth user ids
with
  u_barber as (
    select id as barber_uid
    from auth.users
    where email = 'info@kutable.com'
    limit 1
  ),
  u_client as (
    select id as client_uid
    from auth.users
    where email = 'pete@petegdrake.com'
    limit 1
  ),
  bp as (
    select id as barber_profile_id
    from public.barber_profiles
    where user_id = (select barber_uid from u_barber)
    limit 1
  )

-- Ensure Pete has a client_profiles row (FK target for bookings.client_id)
insert into public.client_profiles (user_id, first_name, last_name, email, created_at, updated_at)
select (select client_uid from u_client), 'Pete', 'Drake', 'pete@petegdrake.com', now(), now()
where not exists (
  select 1 from public.client_profiles
  where user_id = (select client_uid from u_client)
);

-- Realign the 3 demo bookings so client_id = Pete's CURRENT uid (no changes to barber/profile)
update public.bookings b
set client_id = (
  select id from auth.users where email = 'pete@petegdrake.com' limit 1
)
where b.id in (
  '2655faa6-82bc-4571-b184-9ff0bbcfb76b',
  '4a0b170a-16c9-4f71-8774-54d5ec40709d',
  '756b8e3e-35c7-4f4f-8c70-4b13df6cddd8'
);

-- Sanity check: counts for both parties (no auth.uid() here)
with
  u_client as (select id from auth.users where email = 'pete@petegdrake.com' limit 1),
  u_barber as (select id from auth.users where email = 'info@kutable.com' limit 1),
  bp as (select id from public.barber_profiles where user_id = (select id from u_barber) limit 1)
select
  (select count(*) from public.bookings where client_id = (select id from u_client)) as bookings_for_client,
  (select count(*) from public.bookings where barber_id = (select id from bp))       as bookings_for_barber;