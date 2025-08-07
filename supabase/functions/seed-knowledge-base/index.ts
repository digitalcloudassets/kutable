import { createClient } from 'npm:@supabase/supabase-js@2'
import OpenAI from 'npm:openai@4.28.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openaiApiKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required API keys'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Kutable knowledge base content
    const knowledgeItems = [
      {
        title: "What is Kutable?",
        content: "Kutable is a professional barber booking platform that connects customers with barbers. Customers can find and book barbers online, while barbers can claim profiles, manage bookings, and accept payments. The platform is mobile-first with SMS confirmations and reminders included.",
        category: "general"
      },
      {
        title: "How to Book an Appointment",
        content: "To book an appointment: 1) Browse our barber directory and find a barber you like, 2) Select a service and available time slot, 3) Complete booking with secure payment, 4) Receive instant SMS confirmation. You'll also get a reminder 24 hours before your appointment.",
        category: "booking"
      },
      {
        title: "Cancellation and Rescheduling",
        content: "You can cancel appointments up to 24 hours in advance directly from your dashboard for a full refund. For rescheduling or cancellations within 24 hours, please contact your barber directly using their phone number on their profile.",
        category: "booking"
      },
      {
        title: "Payment and Pricing",
        content: "Payments are processed securely through Stripe when you book. There are no additional booking fees for customers. Barbers pay a 4% total fee per transaction (1% platform fee + ~3% payment processing). All payments are secure and encrypted.",
        category: "payment"
      },
      {
        title: "For Barbers - How to Get Started",
        content: "Barbers can find their business in our directory and claim it for free. After claiming, you can set your services, pricing, availability, and connect your bank account to start accepting online payments. No monthly fees or setup costs.",
        category: "barber"
      },
      {
        title: "Barber Fees and Earnings",
        content: "Barbers pay only when they earn - there's a 4% total fee per transaction which includes 1% platform fee and approximately 3% payment processing fee. No monthly subscriptions, setup fees, or contracts. Money goes directly to your bank account.",
        category: "barber"
      },
      {
        title: "SMS Notifications",
        content: "After booking, you'll receive SMS confirmations and 24-hour reminders. You can opt out anytime by replying STOP to any message. Make sure to provide a valid phone number during booking to receive notifications.",
        category: "technical"
      },
      {
        title: "Account Creation and Profiles",
        content: "Creating an account is free and takes just a minute. You need an account to book appointments and manage your booking history. For barbers, claiming a profile allows you to start accepting online bookings and payments.",
        category: "general"
      },
      {
        title: "Finding Barbers",
        content: "Browse our verified directory of professional barbers. You can filter by location, rating, services, and availability. All barbers show reviews from real customers and you can see their portfolios and pricing.",
        category: "general"
      },
      {
        title: "Support and Help",
        content: "For platform and technical issues, email support@kutable.com. For appointment questions (changes, directions, etc.), contact your barber directly using their phone number on their profile. We respond to support emails within 24 hours.",
        category: "support"
      },
      {
        title: "Privacy and Security",
        content: "Your data is secure with bank-level encryption. We never sell your information and only use it to provide services. You can manage your communication preferences in your dashboard and opt out of marketing while keeping essential booking notifications.",
        category: "privacy"
      },
      {
        title: "Mobile Experience",
        content: "Kutable is designed mobile-first. Everything works perfectly on phones, tablets, and desktops. Barbers can share their profile links anywhere and customers can book easily from any device.",
        category: "technical"
      }
    ];

    let processedCount = 0;
    let errorCount = 0;

    // Clear existing knowledge base
    const { error: clearError } = await supabase
      .from('knowledge_base')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (clearError) {
      console.warn('Error clearing knowledge base:', clearError);
    }

    // Process each knowledge item
    for (const item of knowledgeItems) {
      try {
        // Generate embedding
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: `${item.title}\n\n${item.content}`,
        });

        const embedding = embeddingResponse.data[0].embedding;

        // Store in database
        const { error: insertError } = await supabase
          .from('knowledge_base')
          .insert({
            title: item.title,
            content: item.content,
            embedding: embedding,
            category: item.category
          });

        if (insertError) {
          console.error(`Error inserting ${item.title}:`, insertError);
          errorCount++;
        } else {
          processedCount++;
          console.log(`✅ Processed: ${item.title}`);
        }

      } catch (error) {
        console.error(`Error processing ${item.title}:`, error);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Knowledge base seeded successfully`,
        stats: {
          processed: processedCount,
          errors: errorCount,
          total: knowledgeItems.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Knowledge base seeding error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Knowledge base seeding failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})