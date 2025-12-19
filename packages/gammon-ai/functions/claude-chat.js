const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Claude API configuration
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

// OpenAI ChatGPT fallback configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

// AI service attempt tracking
async function callClaudeAI(messages, systemPrompt, playerLevel) {
  if (!CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_UNAVAILABLE')
  }

  const claudeRequest = {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    system: systemPrompt,
    messages: messages
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(claudeRequest)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Claude API error:', response.status, errorText)
    throw new Error(`CLAUDE_API_ERROR: ${response.status}`)
  }

  const data = await response.json()
  return {
    response: data.content[0].text,
    aiService: 'claude',
    model: 'claude-3-5-sonnet-20241022'
  }
}

async function callChatGPT(messages, systemPrompt, playerLevel) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_UNAVAILABLE')
  }

  const gptMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  ]

  const gptRequest = {
    model: 'gpt-4',
    messages: gptMessages,
    max_tokens: 1000,
    temperature: 0.7
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(gptRequest)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('OpenAI API error:', response.status, errorText)
    throw new Error(`OPENAI_API_ERROR: ${response.status}`)
  }

  const data = await response.json()
  return {
    response: data.choices[0].message.content,
    aiService: 'chatgpt',
    model: 'gpt-4'
  }
}

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: ''
    }
  }

  try {
    // Get JWT token from Authorization header
    const authHeader = event.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const token = authHeader.substring(7)

    // Verify JWT token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Invalid token' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body)
    const { message, gameContext, playerLevel } = body

    if (!message) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Message is required' })
      }
    }

    // Check usage quota
    const { data: usageData, error: usageError } = await supabase
      .from('user_analytics')
      .select('claude_requests_this_month, claude_quota_remaining')
      .eq('user_id', user.id)
      .single()

    if (usageError) {
      console.error('Usage check error:', usageError)
    }

    const quotaRemaining = usageData?.claude_quota_remaining || 10 // Default 10 free

    if (quotaRemaining <= 0) {
      return {
        statusCode: 429,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Claude quota exceeded. Upgrade to premium for unlimited access.'
        })
      }
    }

    // Prepare Claude API request
    const systemPrompt = `You are Claude, an expert backgammon coach and assistant. Help players improve their game with clear, educational explanations.

Current player level: ${playerLevel || 'INTERMEDIATE'}

Guidelines:
- Be encouraging and patient
- Explain concepts clearly
- Use backgammon terminology correctly
- Focus on strategic thinking
- Provide actionable advice
- Keep responses conversational but informative

${gameContext ? `Current game context: ${JSON.stringify(gameContext)}` : ''}`

    const messages = [
      {
        role: 'user',
        content: message
      }
    ]

    let aiResult
    let usedFallback = false

    // Try Claude first
    try {
      console.log('Attempting Claude AI...')
      aiResult = await callClaudeAI(messages, systemPrompt, playerLevel)
      console.log('Claude AI succeeded')
    } catch (claudeError) {
      console.log('Claude AI failed, trying ChatGPT fallback...', claudeError.message)

      // Try ChatGPT as fallback
      try {
        aiResult = await callChatGPT(messages, systemPrompt, playerLevel)
        usedFallback = true
        console.log('ChatGPT fallback succeeded')
      } catch (gptError) {
        console.error('Both Claude and ChatGPT failed:', claudeError.message, gptError.message)
        return {
          statusCode: 503,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: 'AI services temporarily unavailable. Please try again later.',
            details: 'Both Claude and ChatGPT are currently unavailable.'
          })
        }
      }
    }

    const response = aiResult.response

    // Update usage statistics (track which AI service was used)
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const usageUpdate = {
      claude_requests_this_month: (usageData?.claude_requests_this_month || 0) + 1,
      claude_quota_remaining: quotaRemaining - 1
    }

    // Add AI service tracking
    if (usedFallback) {
      usageUpdate.chatgpt_requests_this_month = (usageData?.chatgpt_requests_this_month || 0) + 1
    }

    await supabase
      .from('user_analytics')
      .upsert({
        user_id: user.id,
        date: now.toISOString().split('T')[0],
        ...usageUpdate
      }, {
        onConflict: 'user_id,date'
      })

    // Return response with AI service info
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({
        success: true,
        data: {
          response: response,
          aiService: aiResult.aiService,
          model: aiResult.model,
          usedFallback: usedFallback,
          usage: {
            remaining: quotaRemaining - 1,
            total: 10 // Free tier limit
          }
        }
      })
    }

  } catch (error) {
    console.error('Claude chat error:', error)

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    }
  }
}
