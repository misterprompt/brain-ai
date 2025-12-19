// GuruBot - Educational AI Coach Netlify Function
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Claude API configuration (for GuruBot)
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

exports.handler = async (event, context) => {
  // Handle CORS
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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' })
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
    const { message, playerLevel, gameContext, lessonType } = body

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
    const { data: usageData } = await supabase
      .from('user_analytics')
      .select('gurubot_requests_this_month, gurubot_quota_remaining')
      .eq('user_id', user.id)
      .single()

    const quotaRemaining = usageData?.gurubot_quota_remaining || 20 // Higher quota for educational bot

    if (quotaRemaining <= 0) {
      return {
        statusCode: 429,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'GuruBot quota exceeded. Educational content is limited to 20 sessions per month for free users.'
        })
      }
    }

    // Prepare GuruBot educational prompt
    const systemPrompt = `You are GuruBot, an expert backgammon coach focused on education and learning. Your goal is to help players improve their understanding of backgammon strategy, tactics, and theory.

Key characteristics:
- Patient and encouraging teacher
- Explain concepts step-by-step
- Use simple analogies and examples
- Focus on fundamental principles
- Ask questions to guide learning
- Provide progressive challenges
- Celebrate small improvements

Current player level: ${playerLevel || 'BEGINNER'}
Lesson focus: ${lessonType || 'general improvement'}

${gameContext ? `Current game context: ${JSON.stringify(gameContext)}` : ''}

Always structure responses educationally with:
1. Clear explanations
2. Practical examples
3. Learning objectives
4. Follow-up questions`

    const claudeRequest = {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1200,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message
        }
      ]
    }

    // Call Claude API
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
      throw new Error(`Claude API error: ${response.status}`)
    }

    const data = await response.json()
    const guruResponse = data.content[0].text

    // Update usage statistics
    const now = new Date()
    await supabase
      .from('user_analytics')
      .upsert({
        user_id: user.id,
        date: now.toISOString().split('T')[0],
        gurubot_requests_this_month: (usageData?.gurubot_requests_this_month || 0) + 1,
        gurubot_quota_remaining: quotaRemaining - 1
      }, {
        onConflict: 'user_id,date'
      })

    // Return educational response
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({
        success: true,
        data: {
          response: guruResponse,
          aiService: 'gurubot',
          model: 'claude-3-5-sonnet-20241022',
          lessonType: lessonType || 'general',
          usage: {
            remaining: quotaRemaining - 1,
            total: 20 // Educational quota
          }
        }
      })
    }

  } catch (error) {
    console.error('GuruBot error:', error)

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
