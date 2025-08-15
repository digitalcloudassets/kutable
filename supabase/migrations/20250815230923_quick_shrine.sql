/*
  # Create Enriched Messages View

  1. New Views
    - `enriched_messages`
      - Joins messages with client_profiles and barber_profiles
      - Provides sender_name and receiver_name for display
      - Uses user_id linkage to connect profiles to message participants

  2. Purpose
    - Simplifies message display by providing pre-joined participant names
    - Handles both client and barber participants in a single view
    - Reduces client-side joins and improves messaging performance
*/

create or replace view enriched_messages as
select
  m.*,
  coalesce(cp_sender.first_name || ' ' || cp_sender.last_name, bp_sender.owner_name) as sender_name,
  coalesce(cp_receiver.first_name || ' ' || cp_receiver.last_name, bp_receiver.owner_name) as receiver_name
from messages m
left join client_profiles cp_sender on cp_sender.user_id = m.sender_id
left join barber_profiles bp_sender on bp_sender.user_id = m.sender_id
left join client_profiles cp_receiver on cp_receiver.user_id = m.receiver_id
left join barber_profiles bp_receiver on bp_receiver.user_id = m.receiver_id;