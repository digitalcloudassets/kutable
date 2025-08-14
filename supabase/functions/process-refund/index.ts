import Stripe from 'npm:stripe@14.21.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, withCors, handlePreflight } from '../_shared/cors.ts'

const headers = corsHeaders(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

const json = (status: number, body: unknown) => 
  new Response(JSON.stringify(body), { status, headers: {} }) // Will be filled by caller

interface RefundRequest {
  payment_intent_id?: string;
  booking_id: string;
  amount_cents?: number;
  reason?: string;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req, headers);
  if (preflight) return preflight;

  const cors = withCors(req, headers);
  if (!cors.ok) return cors.res;

  const json = (status: number, body: unknown) => 
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors.headers, 'Content-Type': 'application/json' }
    })

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
      return json(500, { success: false, error: 'Missing required environment variables' })
    }

    const stripe = new Stripe(stripeSecretKey, { 
      apiVersion: '2023-10-16',
    })
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { booking_id, payment_intent_id, amount_cents, reason }: RefundRequest = await req.json()
    
    if (!booking_id) {
      return json(400, { success: false, error: 'booking_id is required' })
    }

    console.log('Processing refund request:', {
      booking_id,
      payment_intent_id,
      amount_cents,
      reason: reason || 'not specified'
    })

    // Auth: Resolve barber by auth user ID
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    
    if (!token) {
      return json(401, { success: false, error: 'Authorization header required' })
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return json(401, { success: false, error: 'Invalid authorization token' })
    }

    // Find barber profile for this user
    const { data: barber, error: barberError } = await supabase
      .from('barber_profiles')
      .select('id, business_name')
      .eq('user_id', user.id)
      .single()

    if (barberError || !barber) {
      return json(403, { success: false, error: 'Barber profile not found or access denied' })
    }

    console.log('Authorized barber:', { barberId: barber.id, businessName: barber.business_name })

    // Load payment for this booking & barber
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, stripe_charge_id, gross_amount_cents, application_fee_cents, status')
      .eq('booking_id', booking_id)
      .eq('barber_id', barber.id)
      .in('status', ['succeeded'])
      .single()

    if (paymentError || !payment) {
      console.error('Payment lookup failed:', paymentError)
      return json(404, { success: false, error: 'Payment not found or not eligible for refund' })
    }

    // Check if already refunded
    const { data: existingRefunds } = await supabase
      .from('payments')
      .select('status')
      .eq('booking_id', booking_id)
      .eq('status', 'refunded')
      .maybeSingle()

    if (existingRefunds) {
      return json(409, { success: false, error: 'Payment has already been refunded' })
    }

    const grossAmount = payment.gross_amount_cents || 0
    const toRefund = typeof amount_cents === 'number' && amount_cents > 0 
      ? Math.min(Math.floor(amount_cents), grossAmount)
      : grossAmount

    if (toRefund <= 0) {
      return json(400, { success: false, error: 'Invalid refund amount' })
    }

    // Determine charge ID
    let chargeId = payment.stripe_charge_id as string | null
    if (!chargeId) {
      if (!payment_intent_id) {
        return json(400, { success: false, error: 'payment_intent_id required when no stored charge ID' })
      }
      
      const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)
      chargeId = paymentIntent.charges?.data?.[0]?.id || null
      
      if (!chargeId) {
        return json(404, { success: false, error: 'No charge found for this payment intent' })
      }
    }

    console.log('Refund details:', {
      chargeId,
      toRefund,
      grossAmount,
      applicationFee: payment.application_fee_cents
    })

    // Create idempotent refund with Stripe Connect support
    const idempotencyKey = `refund:${booking_id}:${toRefund}`
    
    const refundParams: Stripe.RefundCreateParams = {
      charge: chargeId,
      amount: toRefund,
      reason: reason === 'requested_by_customer' ? 'requested_by_customer' : undefined,
      // For Stripe Connect destination charges, reverse the transfer and refund app fee
      refund_application_fee: true,
      reverse_transfer: true
    }

    const refund = await stripe.refunds.create(refundParams, {
      idempotencyKey
    })

    console.log('Stripe refund created:', {
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
      applicationFeeRefunded: refund.metadata?.application_fee_refunded
    })

    const fullyRefunded = toRefund >= grossAmount
    const remainingCents = Math.max(grossAmount - toRefund, 0)

    // Update payment record
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        status: fullyRefunded ? 'refunded' : 'succeeded',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id)

    if (paymentUpdateError) {
      console.error('Error updating payment record:', paymentUpdateError)
      // Don't fail the entire operation since Stripe refund succeeded
    }

    // Update booking status if fully refunded
    if (fullyRefunded) {
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking_id)

      if (bookingUpdateError) {
        console.error('Error updating booking status:', bookingUpdateError)
      }
    }

    // Send notification to customer about refund
    try {
      const notificationEvent = fullyRefunded ? 'booking_cancelled' : 'booking_updated'
      
      await supabase.functions.invoke('process-booking-notifications', {
        body: {
          bookingId: booking_id,
          event: notificationEvent
        }
      })
      
      console.log('Refund notification sent successfully')
    } catch (notificationError) {
      console.warn('Failed to send refund notification (refund still processed):', notificationError)
    }

    return json(200, {
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        status: refund.status,
        created: refund.created
      },
      fully_refunded: fullyRefunded,
      remaining_cents: remainingCents,
      booking_id: booking_id
    })

  } catch (error) {
    console.error('Refund processing error:', error)
    
    // Enhanced error handling for Stripe-specific errors
    if (error instanceof Stripe.errors.StripeError) {
      return json(400, {
        success: false,
        error: error.message,
        type: error.type,
        code: error.code
      })
    }
    
    return json(500, {
      success: false,
      error: error instanceof Error ? error.message : 'Refund processing failed'
    })
  }
})