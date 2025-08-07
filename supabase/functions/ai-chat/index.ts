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

// Enhanced logging function
const logEvent = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logData = data ? JSON.stringify(data, null, 2) : '';
  
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  if (logData) {
    console.log(`[${timestamp}] [DATA] ${logData}`);
  }
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  // Log incoming request
  logEvent('info', `[${requestId}] Incoming AI chat request`, {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  if (req.method === 'OPTIONS') {
    logEvent('info', `[${requestId}] OPTIONS request handled`);
    return new Response('ok', { headers: corsHeaders });
  }

  let requestBody: ChatRequest;
  
  try {
    // Parse and validate request body
    requestBody = await req.json();
    logEvent('info', `[${requestId}] Request body parsed`, {
      messageLength: requestBody.message?.length,
      hasConversationId: !!requestBody.conversationId,
      hasSessionId: !!requestBody.sessionId,
      hasUserId: !!requestBody.userId
    });
  } catch (error) {
    logEvent('error', `[${requestId}] Failed to parse request body`, { error: error.message });
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid request format - unable to parse JSON body'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';

    logEvent('info', `[${requestId}] Client IP: ${clientIP}`);

    // Rate limiting by IP
    if (isRateLimited(`chat_${clientIP}`, 20, 60 * 60 * 1000)) {
      logEvent('warn', `[${requestId}] Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many chat requests. Please wait before sending more messages.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        },
      );
    }

    // Get and validate environment variables
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    logEvent('info', `[${requestId}] Environment variables check`, {
      hasOpenaiKey: !!openaiApiKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseServiceKey: !!supabaseServiceKey,
      openaiKeyPrefix: openaiApiKey?.substring(0, 7) || 'not-set',
      supabaseUrlFormat: supabaseUrl?.includes('.supabase.co') || false
    });

    if (!openaiApiKey || openaiApiKey.trim() === '') {
      logEvent('error', `[${requestId}] OpenAI API key not configured`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "AI chat is currently unavailable - OpenAI API key not configured. Please contact support.",
          details: "OpenAI API key is missing or empty in environment variables"
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      logEvent('error', `[${requestId}] Supabase configuration missing`, {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Service temporarily unavailable - database connection not configured.",
          details: "Supabase configuration is missing"
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Initialize services with logging
    let openai: OpenAI;
    try {
      openai = new OpenAI({
        apiKey: openaiApiKey,
      });
      logEvent('info', `[${requestId}] OpenAI client initialized successfully`);
    } catch (error) {
      logEvent('error', `[${requestId}] Failed to initialize OpenAI client`, { error: error.message });
      return new Response(
        JSON.stringify({
          success: false,
          error: "AI service initialization failed - invalid API key format.",
          details: "OpenAI client could not be initialized"
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    logEvent('info', `[${requestId}] Supabase client initialized`);

    const { message, conversationId, sessionId, userId } = requestBody;

    // Validate input
    if (!message || typeof message !== 'string') {
      logEvent('warn', `[${requestId}] Invalid message input`, { messageType: typeof message });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Message is required and must be a string'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    const sanitizedMessage = sanitizeInput(message, 2000);
    
    if (sanitizedMessage.length < 1) {
      logEvent('warn', `[${requestId}] Empty message after sanitization`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Message cannot be empty'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    logEvent('info', `[${requestId}] Message validated`, {
      originalLength: message.length,
      sanitizedLength: sanitizedMessage.length,
      preview: sanitizedMessage.substring(0, 100)
    });

    // Generate session ID if not provided
    const finalSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logEvent('info', `[${requestId}] Session ID: ${finalSessionId}`);

    // Get or create conversation
    let conversation;
    if (conversationId) {
      logEvent('info', `[${requestId}] Looking up existing conversation: ${conversationId}`);
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      
      if (error) {
        logEvent('warn', `[${requestId}] Failed to find conversation`, { error: error.message });
      } else {
        conversation = data;
        logEvent('info', `[${requestId}] Found existing conversation`);
      }
    }

    if (!conversation) {
      logEvent('info', `[${requestId}] Creating new conversation`);
      const { data: newConversation, error: conversationError } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: userId || null,
          session_id: finalSessionId
        })
        .select()
        .single();

      if (conversationError) {
        logEvent('error', `[${requestId}] Failed to create conversation`, { error: conversationError.message });
        throw conversationError;
      }
      
      conversation = newConversation;
      logEvent('info', `[${requestId}] Created new conversation: ${conversation.id}`);
    }

    // Step 1: Generate embedding for the user's question
    logEvent('info', `[${requestId}] Generating embedding for user question`);
    let embeddingResponse;
    try {
      embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: sanitizedMessage,
      });
      logEvent('info', `[${requestId}] Embedding generated successfully`, {
        embeddingLength: embeddingResponse.data[0].embedding.length
      });
    } catch (error) {
      logEvent('error', `[${requestId}] OpenAI embedding API error`, {
        error: error.message,
        type: error.type,
        code: error.code
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `AI service error: ${error.message}`,
          details: `OpenAI embedding API failed: ${error.type || 'unknown_error'}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 502,
        },
      );
    }

    const questionEmbedding = embeddingResponse.data[0].embedding;

    // Step 2: Perform similarity search in knowledge base
    logEvent('info', `[${requestId}] Searching knowledge base`);
    const { data: relevantDocs, error: searchError } = await supabase.rpc(
      'match_knowledge_base',
      {
        query_embedding: questionEmbedding,
        match_threshold: 0.7,
        match_count: 3
      }
    );

    if (searchError) {
      logEvent('warn', `[${requestId}] Knowledge base search failed`, { error: searchError.message });
    } else {
      logEvent('info', `[${requestId}] Knowledge base search completed`, {
        resultsFound: relevantDocs?.length || 0,
        topMatch: relevantDocs?.[0]?.title || 'none'
      });
    }

    // Step 3: Prepare context for LLM
    let context = '';
    if (relevantDocs && relevantDocs.length > 0) {
      context = relevantDocs
        .map((doc: any) => `**${doc.title}**\n${doc.content}`)
        .join('\n\n');
      logEvent('info', `[${requestId}] Context prepared`, { contextLength: context.length });
    } else {
      logEvent('info', `[${requestId}] No relevant context found`);
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

    logEvent('info', `[${requestId}] Sending request to OpenAI`, {
      model: 'gpt-3.5-turbo',
      systemPromptLength: systemPrompt.length,
      userMessage: sanitizedMessage.substring(0, 100)
    });

    let completion;
    try {
      completion = await openai.chat.completions.create({
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
      
      logEvent('info', `[${requestId}] OpenAI response received`, {
        choices: completion.choices?.length || 0,
        usage: completion.usage,
        finishReason: completion.choices?.[0]?.finish_reason
      });
    } catch (error) {
      logEvent('error', `[${requestId}] OpenAI chat completion API error`, {
        error: error.message,
        type: error.type,
        code: error.code,
        status: error.status
      });
      
      let userFriendlyError = 'AI service temporarily unavailable. Please try again.';
      let statusCode = 502;
      
      if (error.code === 'insufficient_quota') {
        userFriendlyError = 'AI service quota exceeded. Please contact support.';
        statusCode = 503;
      } else if (error.code === 'invalid_api_key') {
        userFriendlyError = 'AI service configuration error. Please contact support.';
        statusCode = 503;
      } else if (error.code === 'rate_limit_exceeded') {
        userFriendlyError = 'AI service rate limit exceeded. Please wait a moment and try again.';
        statusCode = 429;
      } else if (error.status >= 400 && error.status < 500) {
        userFriendlyError = `AI service error: ${error.message}`;
        statusCode = 400;
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: userFriendlyError,
          details: `OpenAI API error: ${error.type || 'unknown'} - ${error.code || 'no_code'}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: statusCode,
        },
      );
    }

    const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again or contact our support team.';
    
    logEvent('info', `[${requestId}] AI response generated`, {
      responseLength: aiResponse.length,
      responsePreview: aiResponse.substring(0, 100)
    });

    // Step 5: Save conversation messages
    logEvent('info', `[${requestId}] Saving messages to database`);
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
      logEvent('error', `[${requestId}] Failed to save chat messages`, { error: messagesError.message });
    } else {
      logEvent('info', `[${requestId}] Messages saved successfully`);
    }

    // Step 6: Return successful response
    const responseData = {
      success: true,
      response: aiResponse,
      conversationId: conversation.id,
      sessionId: finalSessionId,
      sources: relevantDocs ? relevantDocs.slice(0, 2) : [],
      timestamp: new Date().toISOString()
    };

    const processingTime = Date.now() - startTime;
    logEvent('info', `[${requestId}] Request completed successfully`, {
      processingTimeMs: processingTime,
      responseLength: aiResponse.length,
      sourcesCount: relevantDocs?.length || 0
    });

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logEvent('error', `[${requestId}] Unexpected error in AI chat function`, {
      error: error.message,
      stack: error.stack,
      processingTimeMs: processingTime
    });
    
    // Don't expose internal errors to users
    let userMessage = 'I encountered an unexpected error. Please try again.';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        userMessage = 'AI service configuration error. Please contact support.';
        statusCode = 503;
      } else if (error.message.includes('rate')) {
        userMessage = 'Service temporarily overloaded. Please wait a moment and try again.';
        statusCode = 429;
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        userMessage = 'Network error. Please check your connection and try again.';
        statusCode = 502;
      }
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: userMessage,
        details: `Internal error ID: ${requestId}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      },
    );
  }
})