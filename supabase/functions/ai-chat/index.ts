import { createClient } from 'npm:@supabase/supabase-js@2'
import OpenAI from 'npm:openai@4.28.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface ChatRequest {
  message: string;
  conversationId?: string;
  sessionId?: string;
  userId?: string;
}

// Rate limiting for chat requests
const chatAttempts = new Map<string, { count: number; lastAttempt: number }>();

const isRateLimited = (identifier: string, maxAttempts: number = 10, windowMs: number = 60 * 60 * 1000): boolean => {
  const now = Date.now();
  const attempts = chatAttempts.get(identifier);
  
  if (!attempts) {
    chatAttempts.set(identifier, { count: 1, lastAttempt: now });
    return false;
  }
  
  if (now - attempts.lastAttempt > windowMs) {
    chatAttempts.set(identifier, { count: 1, lastAttempt: now });
    return false;
  }
  
  if (attempts.count >= maxAttempts) {
    return true;
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  chatAttempts.set(identifier, attempts);
  
  return false;
};

const sanitizeInput = (input: string, maxLength: number = 2000): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';

    // Rate limiting by IP
    if (isRateLimited(`chat_${clientIP}`, 20, 60 * 60 * 1000)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many chat requests. Please wait before sending more messages.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        },
      )
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openaiApiKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required API keys. Please configure OpenAI and Supabase credentials.'
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

    const { message, conversationId, sessionId, userId }: ChatRequest = await req.json();

    // Validate input
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Message is required and must be a string'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    const sanitizedMessage = sanitizeInput(message, 2000);
    
    if (sanitizedMessage.length < 1) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Message cannot be empty'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Generate session ID if not provided
    const finalSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get or create conversation
    let conversation;
    if (conversationId) {
      const { data } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      conversation = data;
    }

    if (!conversation) {
      const { data: newConversation, error: conversationError } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: userId || null,
          session_id: finalSessionId
        })
        .select()
        .single();

      if (conversationError) throw conversationError;
      conversation = newConversation;
    }

    // Step 1: Generate embedding for the user's question
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: sanitizedMessage,
    });

    const questionEmbedding = embeddingResponse.data[0].embedding;

    // Step 2: Perform similarity search in knowledge base
    const { data: relevantDocs, error: searchError } = await supabase.rpc(
      'match_knowledge_base',
      {
        query_embedding: questionEmbedding,
        match_threshold: 0.7,
        match_count: 3
      }
    );

    if (searchError) {
      console.warn('Knowledge base search failed:', searchError);
    }

    // Step 3: Prepare context for LLM
    let context = '';
    if (relevantDocs && relevantDocs.length > 0) {
      context = relevantDocs
        .map((doc: any) => `**${doc.title}**\n${doc.content}`)
        .join('\n\n');
    }

    // Step 4: Generate AI response
    const systemPrompt = `You are Kutable's helpful AI assistant. Kutable is a professional barber booking platform that connects customers with barbers.

Key Information about Kutable:
- Platform for booking barber appointments online
- Barbers can claim profiles, set services, accept payments
- Customers can find barbers, book appointments, pay online
- 4% total fee per transaction (1% platform + ~3% payment processing)
- SMS confirmations and reminders included
- Mobile-first design for easy sharing

${context ? `\nRelevant Information:\n${context}` : ''}

Instructions:
- Be helpful, friendly, and professional
- Keep responses concise but informative
- If you don't know something specific, suggest contacting support
- For technical issues, direct users to support@kutable.com
- For appointment questions, suggest contacting the barber directly
- Always be encouraging about the platform's benefits

User Question: ${sanitizedMessage}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: sanitizedMessage
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again or contact our support team.';

    // Step 5: Save conversation messages
    const messagesToSave = [
      {
        conversation_id: conversation.id,
        role: 'user',
        content: sanitizedMessage,
        context_used: null
      },
      {
        conversation_id: conversation.id,
        role: 'assistant',
        content: aiResponse,
        context_used: relevantDocs ? { sources: relevantDocs.map((doc: any) => ({ title: doc.title, similarity: doc.similarity })) } : null
      }
    ];

    const { error: messagesError } = await supabase
      .from('chat_messages')
      .insert(messagesToSave);

    if (messagesError) {
      console.error('Error saving chat messages:', messagesError);
    }

    // Step 6: Return response
    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse,
        conversationId: conversation.id,
        sessionId: finalSessionId,
        sources: relevantDocs ? relevantDocs.slice(0, 2) : [],
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('AI chat error:', error);
    
    // Don't expose internal errors
    let userMessage = 'I encountered an error processing your request. Please try again.';
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        userMessage = 'AI service temporarily unavailable. Please contact support for assistance.';
      } else if (error.message.includes('rate')) {
        userMessage = 'Too many requests. Please wait a moment before trying again.';
      }
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: userMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})