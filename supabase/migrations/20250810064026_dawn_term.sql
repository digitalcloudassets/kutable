@@ .. @@
 insert into payments (
   booking_id,
   barber_id,
   customer_id,
   currency,
   gross_amount_cents,
-  application_fee_cents,
+  application_fee_cents,
   stripe_charge_id,
   livemode,
   status,
   created_at
 )
 select 
   b.id as booking_id,
   b.barber_id,
   b.client_id as customer_id,
   'usd' as currency,
-  (b.total_amount * 100)::integer as gross_amount_cents,
-  ((b.total_amount * 100) * 0.01)::integer as application_fee_cents,
+  (b.total_amount * 100)::integer as gross_amount_cents,
+  ((b.total_amount * 100) * 0.002)::integer as application_fee_cents, -- 0.2% instead of 1%
   null as stripe_charge_id,
   true as livemode,
   'succeeded' as status,
   b.created_at
 from bookings b
 where b.status in ('confirmed', 'completed')
   and b.total_amount > 0
   and not exists (
     select 1 from payments p 
     where p.booking_id = b.id
   );