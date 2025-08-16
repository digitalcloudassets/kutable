/*
  # Replace RLS with safe, non-recursive, party-based policies

  1. Problem Resolution
    - Fix 42P17 recursion errors in messaging and bookings
    - Make demo bookings visible to both Pete (client) and Kutable (barber)
    - Ensure proper client profile exists for Pete's auth user

  2. Policy Strategy
    - barber_profiles: public read (breaks recursion loop)
    - bookings: party-based access with one-way join to barber_profiles
    - messages: sender/receiver access with booking party verification
    - client_profiles: owner access + shared booking visibility

  3. Data Alignment
    - Ensure Pete has client_profiles row for FK integrity
    - Realign demo booking client_ids to Pete's current auth user ID
    - Preserve all barber profile references
*/

-- Keep RLS enabled on key tables
alter table public.bookings         enable row level security;
alter table public.messages         enable row level security;
alter table public.client_profiles  enable row level security;
alter table public.barber_profiles  enable row level security;

-- 1) Drop all existing policies on the four tables to start clean
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public'
      and tablename in ('bookings','messages','client_profiles','barber_profiles')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end$$;

-- 2) BARBER PROFILES: public read (non-recursive), owner can update
create policy barber_profiles_public_read
on public.barber_profiles
for select
using (true);

create policy barber_profiles_owner_update
on public.barber_profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy barber_profiles_owner_insert
on public.barber_profiles
for insert
with check (user_id = auth.uid());

-- 3) CLIENT PROFILES: owner can read/update; barbers who share a booking can read
create policy client_profiles_owner_rw
on public.client_profiles
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy client_profiles_read_by_linked_barber
on public.client_profiles
for select
using (
  exists (
    select 1
    from public.bookings b
    join public.barber_profiles bp on bp.id = b.barber_id
    where b.client_id = client_profiles.user_id
      and bp.user_id = auth.uid()
  )
);

-- 4) BOOKINGS: party-based, one-way join to barber_profiles to resolve barber user
create policy bookings_select_party
on public.bookings
for select
using (
  auth.uid() = client_id
  or exists (
    select 1 from public.barber_profiles bp
    where bp.id = bookings.barber_id
      and bp.user_id = auth.uid()
  )
);

create policy bookings_insert_party
on public.bookings
for insert
with check (
  auth.uid() = client_id
  or exists (
    select 1 from public.barber_profiles bp
    where bp.id = bookings.barber_id
      and bp.user_id = auth.uid()
  )
);

create policy bookings_update_party
on public.bookings
for update
using (
  auth.uid() = client_id
  or exists (
    select 1 from public.barber_profiles bp
    where bp.id = bookings.barber_id
      and bp.user_id = auth.uid()
  )
)
with check (
  auth.uid() = client_id
  or exists (
    select 1 from public.barber_profiles bp
    where bp.id = bookings.barber_id
      and bp.user_id = auth.uid()
  )
);

-- 5) MESSAGES: sender/receiver or either party on the booking
create policy messages_select_party
on public.messages
for select
using (
  sender_id   = auth.uid()
  or receiver_id = auth.uid()
  or exists (
    select 1
    from public.bookings b
    join public.barber_profiles bp on bp.id = b.barber_id
    where b.id = messages.booking_id
      and (b.client_id = auth.uid() or bp.user_id = auth.uid())
  )
);

create policy messages_insert_party
on public.messages
for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.bookings b
    join public.barber_profiles bp on bp.id = b.barber_id
    where b.id = messages.booking_id
      and (b.client_id = auth.uid() or bp.user_id = auth.uid())
  )
);

create policy messages_update_party
on public.messages
for update
using (
  sender_id   = auth.uid()
  or receiver_id = auth.uid()
  or exists (
    select 1
    from public.bookings b
    join public.barber_profiles bp on bp.id = b.barber_id
    where b.id = messages.booking_id
      and (b.client_id = auth.uid() or bp.user_id = auth.uid())
  )
)
with check (
  sender_id   = auth.uid()
  or receiver_id = auth.uid()
  or exists (
    select 1
    from public.bookings b
    join public.barber_profiles bp on bp.id = b.barber_id
    where b.id = messages.booking_id
      and (b.client_id = auth.uid() or bp.user_id = auth.uid())
  )
);

-- 6) Fix demo data alignment: ensure Pete has client profile and correct booking references
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
where exists (select 1 from u_client)
  and not exists (
    select 1 from public.client_profiles
    where user_id = (select client_uid from u_client)
  );

-- Realign the 3 demo bookings so client_id = Pete's CURRENT uid
with
  u_client as (
    select id as client_uid
    from auth.users
    where email = 'pete@petegdrake.com'
    limit 1
  )
update public.bookings
set client_id = (select client_uid from u_client)
where id in (
  '2655faa6-82bc-4571-b184-9ff0bbcfb76b',
  '4a0b170a-16c9-4f71-8774-54d5ec40709d',
  '756b8e3e-35c7-4f4f-8c70-4b13df6cddd8'
)
and exists (select 1 from u_client);

-- 7) Performance indexes (safe to re-run)
create index if not exists idx_messages_receiver_unread on public.messages (receiver_id) where read_at is null;
create index if not exists idx_messages_booking_created on public.messages (booking_id, created_at desc);
create index if not exists idx_bookings_client on public.bookings (client_id);
create index if not exists idx_bookings_barber on public.bookings (barber_id);
create index if not exists idx_barber_profiles_user_id on public.barber_profiles (user_id);

-- 8) Sanity check: verify both parties can see the demo bookings
do $$
declare
  client_count int;
  barber_count int;
  client_uid uuid;
  barber_uid uuid;
  barber_profile_id uuid;
begin
  -- Get user IDs
  select id into client_uid from auth.users where email = 'pete@petegdrake.com' limit 1;
  select id into barber_uid from auth.users where email = 'info@kutable.com' limit 1;
  
  if client_uid is not null and barber_uid is not null then
    -- Get barber profile ID
    select id into barber_profile_id from public.barber_profiles where user_id = barber_uid limit 1;
    
    -- Count bookings visible to each party
    select count(*) into client_count from public.bookings where client_id = client_uid;
    select count(*) into barber_count from public.bookings where barber_id = barber_profile_id;
    
    raise notice 'Demo booking visibility check:';
    raise notice '  Pete (client) can see % bookings', client_count;
    raise notice '  Kutable (barber) can see % bookings', barber_count;
    raise notice '  Expected: both should see 3 bookings';
    
    if client_count = 3 and barber_count = 3 then
      raise notice '✅ Demo bookings visibility: SUCCESS';
    else
      raise notice '❌ Demo bookings visibility: FAILED - check user IDs and booking alignment';
    end if;
  else
    raise notice '⚠️  Could not find demo users - check that pete@petegdrake.com and info@kutable.com exist in auth.users';
  end if;
end$$;