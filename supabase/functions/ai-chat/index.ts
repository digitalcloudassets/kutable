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

// Enhanced logging function with detailed context
const logEvent = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logData = data ? JSON.stringify(data, null, 2) : '';
  
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  if (logData) {
    console.log(`[${timestamp}] [DATA] ${logData}`);
  }
};

// Function startup logging
console.log('='.repeat(80));
console.log('🚀 AI Chat Edge Function Starting Up');
console.log('='.repeat(80));

// Log environment variable status on startup
const envCheck = {
  hasOpenaiKey: !!Deno.env.get("OPENAI_API_KEY"),
  hasSupabaseUrl: !!Deno.env.get("SUPABASE_URL"),
  hasSupabaseServiceKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  openaiKeyFormat: Deno.env.get("OPENAI_API_KEY")?.substring(0, 7) || 'not-set',
  supabaseUrlFormat: Deno.env.get("SUPABASE_URL")?.includes('.supabase.co') || false
};

logEvent('info', 'Environment variables check on startup', envCheck);

// Add unhandled rejection handler for Deno
self.addEventListener("unhandledrejection", (event) => {
  logEvent('error', 'UNHANDLED PROMISE REJECTION', {
    reason: event.reason,
    type: typeof event.reason,
    message: event.reason?.message || 'No message',
    stack: event.reason?.stack || 'No stack trace'
  });
  
  // Prevent the default handling (which would terminate the function)
  event.preventDefault();
});

// Add global error handler
self.addEventListener("error", (event) => {
  logEvent('error', 'GLOBAL ERROR', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

console.log('✅ AI Chat Edge Function initialized with error handlers');
console.log('='.repeat(80));

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  // Top-level try/catch to handle ALL errors
  try {
    logEvent('info', `[${requestId}] === NEW REQUEST STARTED ===`);
    logEvent('info', `[${requestId}] Request details`, {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      timestamp: new Date().toISOString()
    });

    if (req.method === 'OPTIONS') {
      logEvent('info', `[${requestId}] OPTIONS preflight request - returning CORS headers`);
      return new Response('ok', { 
        headers: corsHeaders,
        status: 200
      });
    }

    // Parse request body with error handling
    let requestBody: ChatRequest;
    try {
      const bodyText = await req.text();
      logEvent('info', `[${requestId}] Raw request body received`, {
        bodyLength: bodyText.length,
        bodyPreview: bodyText.substring(0, 200)
      });
      
      requestBody = JSON.parse(bodyText);
      logEvent('info', `[${requestId}] Request body parsed successfully`, {
        messageLength: requestBody.message?.length,
        hasConversationId: !!requestBody.conversationId,
        hasSessionId: !!requestBody.sessionId,
        hasUserId: !!requestBody.userId
      });
    } catch (parseError) {
      logEvent('error', `[${requestId}] Failed to parse request body`, {
        error: parseError.message,
        errorType: parseError.constructor.name
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request format - unable to parse JSON body',
          details: `Parse error: ${parseError.message}`,
          requestId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';

    logEvent('info', `[${requestId}] Client IP identified: ${clientIP}`);

    // Rate limiting by IP
    if (isRateLimited(`chat_${clientIP}`, 20, 60 * 60 * 1000)) {
      logEvent('warn', `[${requestId}] Rate limit exceeded`, {
        clientIP,
        rateLimitType: 'chat_requests_per_hour'
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many chat requests. Please wait before sending more messages.',
          details: 'Rate limit: 20 requests per hour per IP',
          requestId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        },
      );
    }

    // Get and validate environment variables with detailed logging
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    logEvent('info', `[${requestId}] Environment variables validation`, {
      hasOpenaiKey: !!openaiApiKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseServiceKey: !!supabaseServiceKey,
      openaiKeyFormat: openaiApiKey ? `${openaiApiKey.substring(0, 7)}...` : 'not-set',
      openaiKeyLength: openaiApiKey?.length || 0,
      supabaseUrlFormat: supabaseUrl?.includes('.supabase.co') || false,
      supabaseServiceKeyFormat: supabaseServiceKey ? `${supabaseServiceKey.substring(0, 10)}...` : 'not-set'
    });

    // Check for missing environment variables
    if (!openaiApiKey || openaiApiKey.trim() === '') {
      logEvent('error', `[${requestId}] OpenAI API key not configured`, {
        keyExists: !!openaiApiKey,
        keyEmpty: openaiApiKey === '',
        keyTrimmedEmpty: openaiApiKey?.trim() === ''
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: "AI chat is currently unavailable - OpenAI API key not configured",
          details: "The OpenAI API key is missing or empty in environment variables. Please add OPENAI_API_KEY to your Supabase Edge Functions environment.",
          requestId,
          configurationHelp: {
            step1: "Go to your Supabase project dashboard",
            step2: "Navigate to Edge Functions settings",
            step3: "Add OPENAI_API_KEY environment variable",
            step4: "Get your API key from https://platform.openai.com/api-keys"
          }
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
        hasServiceKey: !!supabaseServiceKey,
        urlFormat: supabaseUrl?.includes('.supabase.co') || false
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: "Database connection not configured",
          details: "Supabase URL or service key is missing in environment variables",
          requestId
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Initialize services with comprehensive error handling
    let openai: OpenAI;
    try {
      logEvent('info', `[${requestId}] Initializing OpenAI client`);
      openai = new OpenAI({
        apiKey: openaiApiKey,
      });
      logEvent('info', `[${requestId}] OpenAI client initialized successfully`);
    } catch (openaiInitError) {
      logEvent('error', `[${requestId}] Failed to initialize OpenAI client`, {
        error: openaiInitError.message,
        errorType: openaiInitError.constructor.name,
        apiKeyLength: openaiApiKey.length,
        apiKeyPrefix: openaiApiKey.substring(0, 7)
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: "AI service initialization failed",
          details: `OpenAI client initialization error: ${openaiInitError.message}`,
          requestId
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    let supabase;
    try {
      logEvent('info', `[${requestId}] Initializing Supabase client`);
      supabase = createClient(supabaseUrl, supabaseServiceKey);
      logEvent('info', `[${requestId}] Supabase client initialized successfully`);
    } catch (supabaseInitError) {
      logEvent('error', `[${requestId}] Failed to initialize Supabase client`, {
        error: supabaseInitError.message,
        errorType: supabaseInitError.constructor.name
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: "Database connection failed",
          details: `Supabase client initialization error: ${supabaseInitError.message}`,
          requestId
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const { message, conversationId, sessionId, userId } = requestBody;

    // Input validation with detailed logging
    if (!message || typeof message !== 'string') {
      logEvent('warn', `[${requestId}] Invalid message input`, {
        messageExists: !!message,
        messageType: typeof message,
        messageLength: message?.length || 0
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Message is required and must be a string',
          details: `Received: ${typeof message}, expected: string`,
          requestId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    const sanitizedMessage = sanitizeInput(message, 2000);
    
    if (sanitizedMessage.length < 1) {
      logEvent('warn', `[${requestId}] Empty message after sanitization`, {
        originalLength: message.length,
        sanitizedLength: sanitizedMessage.length
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Message cannot be empty after sanitization',
          details: 'Message contained only invalid characters or was too long',
          requestId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    logEvent('info', `[${requestId}] Message validated and sanitized`, {
      originalLength: message.length,
      sanitizedLength: sanitizedMessage.length,
      messagePreview: sanitizedMessage.substring(0, 100) + (sanitizedMessage.length > 100 ? '...' : '')
    });

    // Generate session ID if not provided
    const finalSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logEvent('info', `[${requestId}] Session ID determined: ${finalSessionId}`);

    // Get or create conversation with error handling
    let conversation;
    if (conversationId) {
      logEvent('info', `[${requestId}] Looking up existing conversation: ${conversationId}`);
      try {
        const { data, error } = await supabase
          .from('chat_conversations')
          .select('*')
          .eq('id', conversationId)
          .single();
        
        if (error) {
          logEvent('warn', `[${requestId}] Failed to find existing conversation`, {
            conversationId,
            error: error.message,
            errorCode: error.code
          });
        } else {
          conversation = data;
          logEvent('info', `[${requestId}] Found existing conversation successfully`);
        }
      } catch (conversationLookupError) {
        logEvent('error', `[${requestId}] Exception during conversation lookup`, {
          error: conversationLookupError.message,
          conversationId
        });
      }
    }

    if (!conversation) {
      logEvent('info', `[${requestId}] Creating new conversation`);
      try {
        const { data: newConversation, error: conversationError } = await supabase
          .from('chat_conversations')
          .insert({
            user_id: userId || null,
            session_id: finalSessionId
          })
          .select()
          .single();

        if (conversationError) {
          logEvent('error', `[${requestId}] Failed to create conversation`, {
            error: conversationError.message,
            errorCode: conversationError.code,
            errorDetails: conversationError.details
          });
          throw conversationError;
        }
        
        conversation = newConversation;
        logEvent('info', `[${requestId}] Created new conversation successfully`, {
          conversationId: conversation.id
        });
      } catch (conversationCreateError) {
        logEvent('error', `[${requestId}] Exception during conversation creation`, {
          error: conversationCreateError.message,
          errorType: conversationCreateError.constructor.name
        });
        
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to create chat conversation",
            details: `Database error: ${conversationCreateError.message}`,
            requestId
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          },
        );
      }
    }

    // Step 1: Generate embedding with comprehensive error handling
    logEvent('info', `[${requestId}] Starting OpenAI embedding generation`);
    let embeddingResponse;
    try {
      embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: sanitizedMessage,
      });
      
      logEvent('info', `[${requestId}] OpenAI embedding generated successfully`, {
        model: 'text-embedding-ada-002',
        inputLength: sanitizedMessage.length,
        embeddingLength: embeddingResponse.data[0].embedding.length,
        usage: embeddingResponse.usage
      });
    } catch (embeddingError) {
      logEvent('error', `[${requestId}] OpenAI embedding API error`, {
        error: embeddingError.message,
        type: embeddingError.type,
        code: embeddingError.code,
        status: embeddingError.status,
        param: embeddingError.param,
        apiKeyPrefix: openaiApiKey.substring(0, 7),
        model: 'text-embedding-ada-002',
        inputLength: sanitizedMessage.length
      });
      
      let userMessage = 'AI service error occurred while processing your message';
      let statusCode = 502;
      
      if (embeddingError.code === 'insufficient_quota') {
        userMessage = 'AI service quota exceeded. Please contact support.';
        statusCode = 503;
      } else if (embeddingError.code === 'invalid_api_key') {
        userMessage = 'AI service configuration error. Please contact support.';
        statusCode = 503;
      } else if (embeddingError.code === 'rate_limit_exceeded') {
        userMessage = 'AI service rate limit exceeded. Please wait a moment and try again.';
        statusCode = 429;
      } else if (embeddingError.status >= 400 && embeddingError.status < 500) {
        userMessage = `AI service error: ${embeddingError.message}`;
        statusCode = 400;
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: userMessage,
          details: `OpenAI embedding API error: ${embeddingError.type || 'unknown'} - ${embeddingError.code || 'no_code'}`,
          requestId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: statusCode,
        },
      );
    }

    const questionEmbedding = embeddingResponse.data[0].embedding;

    // Step 2: Knowledge base search with error handling
    logEvent('info', `[${requestId}] Searching knowledge base`);
    let relevantDocs;
    try {
      const { data: searchResults, error: searchError } = await supabase.rpc(
        'match_knowledge_base',
        {
          query_embedding: questionEmbedding,
          match_threshold: 0.7,
          match_count: 3
        }
      );

      if (searchError) {
        logEvent('warn', `[${requestId}] Knowledge base search failed`, {
          error: searchError.message,
          errorCode: searchError.code,
          errorDetails: searchError.details
        });
        // Continue without context rather than failing
        relevantDocs = [];
      } else {
        relevantDocs = searchResults;
        logEvent('info', `[${requestId}] Knowledge base search completed`, {
          resultsFound: relevantDocs?.length || 0,
          topMatch: relevantDocs?.[0]?.title || 'none',
          matchSimilarities: relevantDocs?.map((doc: any) => doc.similarity) || []
        });
      }
    } catch (searchException) {
      logEvent('error', `[${requestId}] Exception during knowledge base search`, {
        error: searchException.message,
        errorType: searchException.constructor.name
      });
      // Continue without context
      relevantDocs = [];
    }

    // Step 3: Prepare context for LLM
    let context = '';
    if (relevantDocs && relevantDocs.length > 0) {
      context = relevantDocs
        .map((doc: any) => `**${doc.title}**\n${doc.content}`)
        .join('\n\n');
      logEvent('info', `[${requestId}] Context prepared from knowledge base`, {
        contextLength: context.length,
        sourcesUsed: relevantDocs.length,
        sourcesList: relevantDocs.map((doc: any) => doc.title)
      });
    } else {
      logEvent('info', `[${requestId}] No relevant context found, proceeding with general knowledge`);
    }

    // Step 4: Generate AI response with comprehensive error handling
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

    logEvent('info', `[${requestId}] Preparing OpenAI chat completion request`, {
      model: 'gpt-3.5-turbo',
      systemPromptLength: systemPrompt.length,
      userMessageLength: sanitizedMessage.length,
      maxTokens: 500,
      temperature: 0.7
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
      
      logEvent('info', `[${requestId}] OpenAI chat completion successful`, {
        choices: completion.choices?.length || 0,
        usage: completion.usage,
        finishReason: completion.choices?.[0]?.finish_reason,
        responseLength: completion.choices?.[0]?.message?.content?.length || 0
      });
    } catch (completionError) {
      logEvent('error', `[${requestId}] OpenAI chat completion API error`, {
        error: completionError.message,
        type: completionError.type,
        code: completionError.code,
        status: completionError.status,
        param: completionError.param,
        apiKeyPrefix: openaiApiKey.substring(0, 7),
        requestDetails: {
          model: 'gpt-3.5-turbo',
          maxTokens: 500,
          temperature: 0.7
        }
      });
      
      let userFriendlyError = 'AI service temporarily unavailable. Please try again.';
      let statusCode = 502;
      
      if (completionError.code === 'insufficient_quota') {
        userFriendlyError = 'AI service quota exceeded. Please contact support at support@kutable.com';
        statusCode = 503;
      } else if (completionError.code === 'invalid_api_key') {
        userFriendlyError = 'AI service configuration error. Please contact support at support@kutable.com';
        statusCode = 503;
      } else if (completionError.code === 'rate_limit_exceeded') {
        userFriendlyError = 'AI service rate limit exceeded. Please wait a moment and try again.';
        statusCode = 429;
      } else if (completionError.status >= 400 && completionError.status < 500) {
        userFriendlyError = `AI service error: ${completionError.message}`;
        statusCode = 400;
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: userFriendlyError,
          details: `OpenAI API error: ${completionError.type || 'unknown'} - ${completionError.code || 'no_code'}`,
          requestId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: statusCode,
        },
      );
    }

    const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again or contact our support team at support@kutable.com';
    
    logEvent('info', `[${requestId}] AI response generated successfully`, {
      responseLength: aiResponse.length,
      responsePreview: aiResponse.substring(0, 150) + (aiResponse.length > 150 ? '...' : ''),
      tokensUsed: completion.usage
    });

    // Step 5: Save conversation messages with error handling
    logEvent('info', `[${requestId}] Saving conversation messages to database`);
    try {
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
          context_used: relevantDocs ? { 
            sources: relevantDocs.map((doc: any) => ({ 
              title: doc.title, 
              similarity: doc.similarity 
            })) 
          } : null
        }
      ];

      const { error: messagesError } = await supabase
        .from('chat_messages')
        .insert(messagesToSave);

      if (messagesError) {
        logEvent('error', `[${requestId}] Failed to save chat messages`, {
          error: messagesError.message,
          errorCode: messagesError.code,
          errorDetails: messagesError.details,
          conversationId: conversation.id
        });
        // Don't fail the entire request for database save issues
      } else {
        logEvent('info', `[${requestId}] Messages saved to database successfully`);
      }
    } catch (messageSaveException) {
      logEvent('error', `[${requestId}] Exception during message save`, {
        error: messageSaveException.message,
        errorType: messageSaveException.constructor.name,
        conversationId: conversation.id
      });
      // Continue - don't fail for database issues
    }

    // Step 6: Return successful response
    const responseData = {
      success: true,
      response: aiResponse,
      conversationId: conversation.id,
      sessionId: finalSessionId,
      sources: relevantDocs ? relevantDocs.slice(0, 2) : [],
      timestamp: new Date().toISOString(),
      requestId
    };

    const processingTime = Date.now() - startTime;
    logEvent('info', `[${requestId}] === REQUEST COMPLETED SUCCESSFULLY ===`, {
      processingTimeMs: processingTime,
      responseLength: aiResponse.length,
      sourcesCount: relevantDocs?.length || 0,
      conversationId: conversation.id,
      sessionId: finalSessionId
    });

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (globalError) {
    // TOP-LEVEL ERROR HANDLER - catches any unhandled errors
    const processingTime = Date.now() - startTime;
    logEvent('error', `[${requestId}] === GLOBAL ERROR HANDLER TRIGGERED ===`, {
      error: globalError.message,
      errorType: globalError.constructor.name,
      stack: globalError.stack,
      processingTimeMs: processingTime,
      requestMethod: req.method,
      requestUrl: req.url
    });
    
    // Provide detailed error information for debugging
    let userMessage = 'An unexpected error occurred while processing your request. Please try again.';
    let statusCode = 500;
    let errorDetails = `Internal error: ${globalError.message}`;
    
    // Categorize errors for better user messaging
    if (globalError instanceof Error) {
      if (globalError.message.includes('API key') || globalError.message.includes('authentication')) {
        userMessage = 'AI service configuration error. Please contact support at support@kutable.com';
        statusCode = 503;
        errorDetails = 'Authentication/API key error';
      } else if (globalError.message.includes('rate') || globalError.message.includes('quota')) {
        userMessage = 'Service temporarily overloaded. Please wait a moment and try again.';
        statusCode = 429;
        errorDetails = 'Rate limiting or quota error';
      } else if (globalError.message.includes('network') || globalError.message.includes('timeout') || globalError.message.includes('fetch')) {
        userMessage = 'Network error occurred. Please check your connection and try again.';
        statusCode = 502;
        errorDetails = 'Network connectivity error';
      } else if (globalError.message.includes('JSON') || globalError.message.includes('parse')) {
        userMessage = 'Invalid request format. Please refresh the page and try again.';
        statusCode = 400;
        errorDetails = 'JSON parsing error';
      }
    }
    
    // Always return a JSON response, never throw
    return new Response(
      JSON.stringify({
        success: false,
        error: userMessage,
        details: errorDetails,
        requestId: requestId || 'unknown',
        timestamp: new Date().toISOString(),
        debug: {
          errorType: globalError.constructor.name,
          processingTime: processingTime,
          environmentOk: envCheck
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      },
    );
  }
})