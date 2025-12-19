// Claude Mistake Analysis - Netlify Function
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Claude API configuration
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
    const { gameMoves, playerColor, mistakeMoveIndex } = body

    if (!gameMoves || !Array.isArray(gameMoves)) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Game moves array is required' })
      }
    }

    // Check usage quota (mistake analysis uses Claude quota)
    const { data: usageData } = await supabase
      .from('user_analytics')
      .select('claude_requests_this_month, claude_quota_remaining')
      .eq('user_id', user.id)
      .single()

    const quotaRemaining = usageData?.claude_quota_remaining || 10

    if (quotaRemaining <= 0) {
      return {
        statusCode: 429,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Claude analysis quota exceeded. Upgrade to premium for unlimited analysis.'
        })
      }
    }

    // Prepare game context for mistake analysis
    const gameContext = createGameContext(gameMoves, playerColor, mistakeMoveIndex)

    const systemPrompt = `You are Claude, an expert backgammon analyst specializing in mistake analysis. Your task is to analyze specific moves in a backgammon game and identify mistakes, suboptimal plays, and missed opportunities.

Analysis Guidelines:
- Focus on the specific move indicated by mistakeMoveIndex
- Explain why the move was suboptimal or incorrect
- Suggest better alternatives with reasoning
- Consider position equity, safety, and strategic goals
- Be educational but concise
- Use backgammon terminology correctly

${gameContext ? `Game context: ${JSON.stringify(gameContext)}` : ''}`

    const userPrompt = `Please analyze the move at index ${mistakeMoveIndex || gameMoves.length - 1} in this backgammon game:

Game moves: ${JSON.stringify(gameMoves, null, 2)}

Focus on:
1. What was the mistake in this move?
2. Why was it a mistake?
3. What would have been a better move?
4. How does this affect the game's equity?
5. Educational lesson from this mistake`

    const claudeRequest = {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt
      }]
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
    const analysis = data.content[0].text

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

    // Parse the analysis into structured format
    const structuredAnalysis = parseMistakeAnalysis(analysis)

    // Return mistake analysis
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({
        success: true,
        data: {
          analysis: structuredAnalysis,
          aiService: 'claude',
          model: 'claude-3-5-sonnet-20241022',
          usage: {
            remaining: quotaRemaining - 1,
            total: 10 // Free tier limit
          }
        }
      })
    }

  } catch (error) {
    console.error('Claude mistake analysis error:', error)

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

// Helper function to create game context
function createGameContext(gameMoves, playerColor, mistakeMoveIndex) {
  const totalMoves = gameMoves.length
  const targetMove = mistakeMoveIndex || totalMoves - 1

  // Get moves leading up to the mistake
  const contextMoves = gameMoves.slice(Math.max(0, targetMove - 5), targetMove + 1)

  return {
    totalMoves,
    targetMoveIndex: targetMove,
    playerColor: playerColor || 'white',
    recentMoves: contextMoves,
    mistakeMove: gameMoves[targetMove]
  }
}

// Parse Claude's analysis into structured format
function parseMistakeAnalysis(analysisText) {
  // Simple parsing to structure the analysis
  const lines = analysisText.split('\n').filter(line => line.trim())

  return {
    summary: analysisText.substring(0, 200) + '...',
    fullAnalysis: analysisText,
    keyPoints: extractKeyPoints(analysisText),
    betterMoves: extractBetterMoves(analysisText),
    equityImpact: extractEquityImpact(analysisText),
    lesson: extractLesson(analysisText)
  }
}

// Extract key points from analysis
function extractKeyPoints(text) {
  const points = []
  const lines = text.split('\n')

  for (const line of lines) {
    if (line.includes('mistake') || line.includes('error') ||
        line.includes('suboptimal') || line.includes('incorrect')) {
      points.push(line.trim())
    }
  }

  return points.slice(0, 3) // Limit to 3 key points
}

// Extract better move suggestions
function extractBetterMoves(text) {
  const suggestions = []
  const lines = text.split('\n')

  for (const line of lines) {
    if (line.includes('better') || line.includes('instead') ||
        line.includes('alternative') || line.includes('should')) {
      suggestions.push(line.trim())
    }
  }

  return suggestions.slice(0, 2) // Limit to 2 suggestions
}

// Extract equity impact
function extractEquityImpact(text) {
  const equityKeywords = ['equity', 'advantage', 'disadvantage', 'cost', 'gain']
  const lines = text.split('\n')

  for (const line of lines) {
    for (const keyword of equityKeywords) {
      if (line.toLowerCase().includes(keyword)) {
        return line.trim()
      }
    }
  }

  return "Equity impact analysis not available"
}

// Extract educational lesson
function extractLesson(text) {
  const lessonKeywords = ['lesson', 'learn', 'remember', 'important', 'key']
  const lines = text.split('\n')

  for (const line of lines) {
    for (const keyword of lessonKeywords) {
      if (line.toLowerCase().includes(keyword)) {
        return line.trim()
      }
    }
  }

  return "Focus on safety and long-term strategic goals"
}
