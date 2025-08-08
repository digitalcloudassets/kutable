import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface NotificationRequest {
  bookingId: string;
  event: 'booking_created' | 'booking_confirmed' | 'booking_cancelled' | 'booking_rescheduled' | 'appointment_reminder';
  skipSMS?: boolean;
  skipEmail?: boolean;
  recipientOverride?: 'barber' | 'client' | 'both';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing database configuration'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { bookingId, event, skipSMS, skipEmail, recipientOverride }: NotificationRequest = await req.json()

    if (!bookingId || !event) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: bookingId and event'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Fetch complete booking data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        appointment_date,
        appointment_time,
        total_amount,
        deposit_amount,
        notes,
        status,
        barber_profiles!inner (
          business_name,
          owner_name,
          phone,
          email,
          address,
          city,
          state,
          sms_consent,
          email_consent,
          communication_consent
        ),
        client_profiles!inner (
          first_name,
          last_name,
          phone,
          email,
          sms_consent,
          email_consent,
          communication_consent
        ),
        services!inner (
          name,
          duration_minutes
        )
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Booking not found'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        },
      )
    }

    const results = {
      sms: { barber: false, client: false },
      email: { barber: false, client: false }
    };

    const recipients = recipientOverride || 'both';

    // Generate notification content
    const appointmentDate = new Date(booking.appointment_date);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });

    // Send notifications to barber
    if ((recipients === 'both' || recipients === 'barber') && booking.barber_profiles) {
      const barber = booking.barber_profiles;
      
      
      // SMS to barber
      if (!skipSMS && (barber.sms_consent !== false) && barber.phone) {
        try {
          const smsMessage = generateBarberSMS(event, booking, formattedDate);
          const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
            body: {
              to: barber.phone,
              message: smsMessage,
              type: mapEventToSMSType(event)
            }
          });

          if (smsError) {
            console.error('SMS Error for barber:', smsError);
            results.sms.barber = false;
          } else {
            results.sms.barber = smsResult?.success || false;
          }
        } catch (error) {
          console.error('Error sending SMS to barber:', error);
          results.sms.barber = false;
        }
      }

      // Email to barber
      if (!skipEmail && (barber.email_consent !== false) && barber.email) {
        try {
          const emailSubject = generateBarberEmailSubject(event, booking);
          const emailMessage = generateBarberEmailMessage(event, booking, formattedDate);
          
          const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
            body: {
              to: barber.email,
              name: barber.owner_name,
              subject: emailSubject,
              message: emailMessage,
              type: event
            }
          });

          if (emailError) {
            console.error('Email Error for barber:', emailError);
            results.email.barber = false;
          } else {
            results.email.barber = emailResult?.success || false;
          }
        } catch (error) {
          console.error('Error sending email to barber:', error);
          results.email.barber = false;
        }
      }
    }

    // Send notifications to client
    if ((recipients === 'both' || recipients === 'client') && booking.client_profiles) {
      const client = booking.client_profiles;
      
      
      // SMS to client
      if (!skipSMS && (client.sms_consent !== false) && client.phone) {
        try {
          const smsMessage = generateClientSMS(event, booking, formattedDate);
          const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
            body: {
              to: client.phone,
              message: smsMessage,
              type: mapEventToSMSType(event)
            }
          });

          if (smsError) {
            console.error('SMS Error for client:', smsError);
            results.sms.client = false;
          } else {
            results.sms.client = smsResult?.success || false;
          }
        } catch (error) {
          console.error('Error sending SMS to client:', error);
          results.sms.client = false;
        }
      }

      // Email to client
      if (!skipEmail && (client.email_consent !== false) && client.email) {
        try {
          const emailSubject = generateClientEmailSubject(event, booking);
          const emailMessage = generateClientEmailMessage(event, booking, formattedDate);
          
          const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
            body: {
              to: client.email,
              name: `${client.first_name} ${client.last_name}`,
              subject: emailSubject,
              message: emailMessage,
              type: event
            }
          });

          if (emailError) {
            console.error('Email Error for client:', emailError);
            results.email.client = false;
          } else {
            results.email.client = emailResult?.success || false;
          }
        } catch (error) {
          console.error('Error sending email to client:', error);
          results.email.client = false;
        }
      }
    }
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: barber.phone,
              message: smsMessage,
              type: mapEventToSMSType(event)
            })
          });

          const smsResult = await smsResponse.json();
          results.sms.barber = smsResult.success || false;
          
        } catch (error) {
          console.error('Error sending SMS to barber:', error);
        }
      }

      // Email to barber
      if (!skipEmail && (barber.email_consent !== false) && barber.email) {
        try {
          const emailSubject = generateBarberEmailSubject(event, booking);
          const emailMessage = generateBarberEmailMessage(event, booking, formattedDate);
          
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: barber.email,
              name: barber.owner_name,
              subject: emailSubject,
              message: emailMessage,
              type: event
            })
          });

          const emailResult = await emailResponse.json();
          results.email.barber = emailResult.success || false;
          
        } catch (error) {
          console.error('Error sending email to barber:', error);
        }
      }
    }

    // Send notifications to client
    if ((recipients === 'both' || recipients === 'client') && booking.client_profiles) {
      const client = booking.client_profiles;
      
      
      // SMS to client
      if (!skipSMS && (client.sms_consent !== false) && client.phone) {
        try {
          const smsMessage = generateClientSMS(event, booking, formattedDate);
          const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: client.phone,
              message: smsMessage,
              type: mapEventToSMSType(event)
            })
          });

          const smsResult = await smsResponse.json();
          results.sms.client = smsResult.success || false;
          
        } catch (error) {
          console.error('Error sending SMS to client:', error);
        }
      }

      // Email to client
      if (!skipEmail && (client.email_consent !== false) && client.email) {
        try {
          const emailSubject = generateClientEmailSubject(event, booking);
          const emailMessage = generateClientEmailMessage(event, booking, formattedDate);
          
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: client.email,
              name: `${client.first_name} ${client.last_name}`,
              subject: emailSubject,
              message: emailMessage,
              type: event
            })
          });

          const emailResult = await emailResponse.json();
          results.email.client = emailResult.success || false;
          
        } catch (error) {
          console.error('Error sending email to client:', error);
        }
      }
    }

    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        event,
        bookingId,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Notification processing error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Notification processing failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

// Helper functions for message generation
function mapEventToSMSType(event: string): string {
  switch (event) {
    case 'booking_created':
    case 'booking_confirmed':
      return 'booking_confirmation';
    case 'appointment_reminder':
      return 'booking_reminder';
    default:
      return 'booking_update';
  }
}

function generateBarberSMS(event: string, booking: any, formattedDate: string): string {
  const clientName = `${booking.client_profiles.first_name} ${booking.client_profiles.last_name}`;
  const serviceName = booking.services.name;
  const appointmentTime = booking.appointment_time;
  const totalAmount = booking.total_amount;

  switch (event) {
    case 'booking_created':
      return `🆕 New Booking Request!\n\n${clientName} wants to book ${serviceName}.\n\n📅 ${formattedDate}\n⏰ ${appointmentTime}\n💰 $${totalAmount}\n\nPlease confirm in your dashboard.\n\n- Kutable`;

    case 'booking_confirmed':
      return `✅ Booking Confirmed!\n\nYou confirmed ${clientName}'s ${serviceName} appointment.\n\n📅 ${formattedDate}\n⏰ ${appointmentTime}\n💰 $${totalAmount}\n\nSee you soon!\n\n- Kutable`;

    case 'booking_cancelled':
      return `❌ Booking Cancelled\n\n${clientName} cancelled their ${serviceName} appointment on ${formattedDate} at ${appointmentTime}.\n\nNo action needed.\n\n- Kutable`;

    case 'appointment_reminder':
      return `⏰ Appointment Tomorrow\n\nReminder: ${clientName} has ${serviceName} tomorrow at ${appointmentTime}.\n\nContact: ${booking.client_profiles.phone || 'No phone provided'}\n\n- Kutable`;

    default:
      return `📱 Booking Update\n\nThere's an update for ${clientName}'s ${serviceName} appointment. Check your dashboard for details.\n\n- Kutable`;
  }
}

function generateClientSMS(event: string, booking: any, formattedDate: string): string {
  const businessName = booking.barber_profiles.business_name;
  const serviceName = booking.services.name;
  const appointmentTime = booking.appointment_time;
  const totalAmount = booking.total_amount;
  const clientName = booking.client_profiles.first_name;

  switch (event) {
    case 'booking_created':
      return `📋 Booking Submitted!\n\nHi ${clientName}! Your ${serviceName} request at ${businessName} has been submitted.\n\n📅 ${formattedDate}\n⏰ ${appointmentTime}\n💰 $${totalAmount}\n\nWe'll notify you once confirmed!\n\n- Kutable`;

    case 'booking_confirmed':
      return `🎉 Booking Confirmed!\n\nHi ${clientName}! Your ${serviceName} appointment at ${businessName} is confirmed.\n\n📅 ${formattedDate}\n⏰ ${appointmentTime}\n💰 $${totalAmount}\n\nWe'll remind you 24hrs before!\n\n- Kutable`;

    case 'booking_cancelled':
      return `❌ Booking Cancelled\n\nHi ${clientName}! Your ${serviceName} appointment at ${businessName} on ${formattedDate} at ${appointmentTime} has been cancelled.\n\nFull refund processed.\n\n- Kutable`;

    case 'appointment_reminder':
      return `⏰ Appointment Reminder\n\nHi ${clientName}! Don't forget your ${serviceName} appointment at ${businessName} tomorrow at ${appointmentTime}.\n\n📍 ${booking.barber_profiles.address ? `${booking.barber_profiles.address}, ${booking.barber_profiles.city}, ${booking.barber_profiles.state}` : 'Contact barber for location'}\n\n- Kutable`;

    default:
      return `📱 Booking Update\n\nHi ${clientName}! There's an update regarding your ${serviceName} appointment at ${businessName}. Check your dashboard for details.\n\n- Kutable`;
  }
}

function generateBarberEmailSubject(event: string, booking: any): string {
  const clientName = `${booking.client_profiles.first_name} ${booking.client_profiles.last_name}`;
  
  switch (event) {
    case 'booking_created':
      return `New Booking Request from ${clientName}`;
    case 'booking_confirmed':
      return `Booking Confirmed with ${clientName}`;
    case 'booking_cancelled':
      return `Booking Cancelled - ${clientName}`;
    case 'appointment_reminder':
      return `Tomorrow's Appointment - ${clientName}`;
    default:
      return `Booking Update - ${clientName}`;
  }
}

function generateClientEmailSubject(event: string, booking: any): string {
  const businessName = booking.barber_profiles.business_name;
  
  switch (event) {
    case 'booking_created':
      return `Booking Request Submitted - ${businessName}`;
    case 'booking_confirmed':
      return `Appointment Confirmed - ${businessName}`;
    case 'booking_cancelled':
      return `Appointment Cancelled - ${businessName}`;
    case 'appointment_reminder':
      return `Appointment Reminder - ${businessName}`;
    default:
      return `Booking Update - ${businessName}`;
  }
}

function generateBarberEmailMessage(event: string, booking: any, formattedDate: string): string {
  const clientName = `${booking.client_profiles.first_name} ${booking.client_profiles.last_name}`;
  const serviceName = booking.services.name;
  const appointmentTime = booking.appointment_time;
  const totalAmount = booking.total_amount;
  const ownerName = booking.barber_profiles.owner_name;

  const baseTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; font-size: 28px; margin: 0;">Kutable</h1>
          <p style="color: #6b7280; margin: 10px 0 0 0;">Professional Barber Booking</p>
        </div>
  `;

  const footerTemplate = `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <a href="https://kutable.com/dashboard" style="background-color: #0066ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            View Dashboard
          </a>
          <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
            Manage your bookings and business at kutable.com
          </p>
        </div>
      </div>
    </div>
  `;

  switch (event) {
    case 'booking_created':
      return baseTemplate + `
        <h2 style="color: #059669; margin-bottom: 20px;">New Booking Request</h2>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${ownerName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          You have a new booking request from <strong>${clientName}</strong>.
        </p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin: 0 0 15px 0;">Booking Details</h3>
          <p style="margin: 5px 0; color: #4b5563;"><strong>Service:</strong> ${serviceName}</p>
          <p style="margin: 5px 0; color: #4b5563;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 5px 0; color: #4b5563;"><strong>Time:</strong> ${appointmentTime}</p>
          <p style="margin: 5px 0; color: #4b5563;"><strong>Amount:</strong> $${totalAmount}</p>
          <p style="margin: 5px 0; color: #4b5563;"><strong>Client Phone:</strong> ${booking.client_profiles.phone || 'Not provided'}</p>
          ${booking.notes ? `<p style="margin: 5px 0; color: #4b5563;"><strong>Notes:</strong> ${booking.notes}</p>` : ''}
        </div>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Please review and confirm this booking in your dashboard.
        </p>
      ` + footerTemplate;

    case 'booking_confirmed':
      return baseTemplate + `
        <h2 style="color: #10b981; margin-bottom: 20px;">Booking Confirmed</h2>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${ownerName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          You've successfully confirmed the appointment with <strong>${clientName}</strong>.
        </p>
        
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="color: #065f46; margin: 0 0 15px 0;">Confirmed Appointment</h3>
          <p style="margin: 5px 0; color: #047857;"><strong>Service:</strong> ${serviceName}</p>
          <p style="margin: 5px 0; color: #047857;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 5px 0; color: #047857;"><strong>Time:</strong> ${appointmentTime}</p>
          <p style="margin: 5px 0; color: #047857;"><strong>Amount:</strong> $${totalAmount}</p>
          <p style="margin: 5px 0; color: #047857;"><strong>Client Phone:</strong> ${booking.client_profiles.phone || 'Not provided'}</p>
        </div>
      ` + footerTemplate;

    default:
      return baseTemplate + `
        <h2 style="color: #6b7280; margin-bottom: 20px;">Booking Update</h2>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${ownerName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          There's an update regarding your appointment with ${clientName}.
        </p>
      ` + footerTemplate;
  }
}

function generateClientEmailMessage(event: string, booking: any, formattedDate: string): string {
  const businessName = booking.barber_profiles.business_name;
  const serviceName = booking.services.name;
  const appointmentTime = booking.appointment_time;
  const totalAmount = booking.total_amount;
  const clientName = booking.client_profiles.first_name;

  const baseTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; font-size: 28px; margin: 0;">Kutable</h1>
          <p style="color: #6b7280; margin: 10px 0 0 0;">Professional Barber Booking</p>
        </div>
  `;

  const footerTemplate = `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <a href="https://kutable.com/dashboard" style="background-color: #0066ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            View My Bookings
          </a>
          <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
            Manage your appointments at kutable.com
          </p>
        </div>
      </div>
    </div>
  `;

  switch (event) {
    case 'booking_confirmed':
      return baseTemplate + `
        <h2 style="color: #10b981; margin-bottom: 20px;">🎉 Appointment Confirmed!</h2>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${clientName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Great news! Your appointment with <strong>${businessName}</strong> has been confirmed.
        </p>
        
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="color: #065f46; margin: 0 0 15px 0;">Your Appointment</h3>
          <p style="margin: 5px 0; color: #047857;"><strong>Service:</strong> ${serviceName}</p>
          <p style="margin: 5px 0; color: #047857;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 5px 0; color: #047857;"><strong>Time:</strong> ${appointmentTime}</p>
          <p style="margin: 5px 0; color: #047857;"><strong>Location:</strong> ${booking.barber_profiles.address ? `${booking.barber_profiles.address}, ${booking.barber_profiles.city}, ${booking.barber_profiles.state}` : 'Contact barber for details'}</p>
          <p style="margin: 5px 0; color: #047857;"><strong>Barber Phone:</strong> ${booking.barber_profiles.phone || 'Available in your dashboard'}</p>
        </div>

        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          We'll send you a reminder 24 hours before your appointment. Looking forward to seeing you!
        </p>
      ` + footerTemplate;

    default:
      return baseTemplate + `
        <h2 style="color: #6b7280; margin-bottom: 20px;">Booking Update</h2>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${clientName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          There's an update regarding your appointment with ${businessName}.
        </p>
      ` + footerTemplate;
  }
}