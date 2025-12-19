const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Claude API configuration
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

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
    const { boardState, dice, playerLevel } = body

    if (!boardState) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Board state is required' })
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

    const quotaRemaining = usageData?.claude_quota_remaining || 10

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

    // Prepare Claude analysis prompt
    const systemPrompt = `You are Claude, an expert backgammon analyst. Analyze the current board position and provide detailed strategic insights.

Player level: ${playerLevel || 'INTERMEDIATE'}

Board state: ${JSON.stringify(boardState)}
Dice: ${dice ? dice.join(', ') : 'Not rolled'}

Provide:
1. Position evaluation (strength/weakness)
2. Best strategic moves available
3. Key tactical considerations
4. Equity assessment
5. Educational insights for improvement

Be concise but thorough, focus on actionable advice.`

    const claudeRequest = {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Analyze this backgammon position and provide strategic insights.'
        }
      ]
    }

    // Call Claude API
    const claudeResponse = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(claudeRequest)
    })

    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${claudeResponse.status}`)
    }

    const claudeData = await claudeResponse.json()
    const analysis = claudeData.content[0].text

    // Update usage statistics
    const now = new Date()
    await supabase
      .from('user_analytics')
      .upsert({
        user_id: user.id,
        date: now.toISOString().split('T')[0],
        claude_requests_this_month: (usageData?.claude_requests_this_month || 0) + 1,
        claude_quota_remaining: quotaRemaining - 1
      }, {
        onConflict: 'user_id,date'
      })

    // Return analysis
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({
        success: true,
        data: {
          analysis: analysis,
          usage: {
            remaining: quotaRemaining - 1,
            total: 10
          }
        }
      })
    }

  } catch (error) {
    console.error('Claude analyze error:', error)

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
