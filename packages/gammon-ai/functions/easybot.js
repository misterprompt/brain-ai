// EasyBot - Beginner-Friendly AI Netlify Function
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Claude API configuration (for EasyBot)
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
    const { boardState, dice, playerColor, difficulty } = body

    if (!boardState || !dice) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Board state and dice are required' })
      }
    }

    // EasyBot logic: Simplified AI for beginners
    // Focus on basic moves, clear explanations, and learning opportunities

    const systemPrompt = `You are EasyBot, a friendly and patient backgammon AI designed for beginners. Your goal is to provide simple, clear moves while teaching basic concepts.

EasyBot characteristics:
- Make obvious, straightforward moves
- Prioritize safety over complex strategies
- Use simple explanations that beginners can understand
- Occasionally make "learning mistakes" to teach concepts
- Always explain the reasoning clearly
- Encourage good habits even when making suboptimal moves

Current difficulty: ${difficulty || 'EASY'}
Focus on teaching: Basic movement, safety, and simple tactics

Board analysis should consider:
1. Simple safe moves first
2. Basic attacking opportunities
3. Clear explanations for each choice
4. Learning opportunities for the human player`

    // Create a simplified board representation for EasyBot
    const boardDescription = createSimpleBoardDescription(boardState, dice, playerColor)

    const userPrompt = `As EasyBot, analyze this backgammon position and make a move for ${playerColor}:

${boardDescription}

Dice rolled: ${dice.join(' and ')}

Choose a simple, clear move that a beginner would make. Explain your choice in easy-to-understand terms. Focus on basic concepts like safety, simplicity, and learning opportunities.`

    const claudeRequest = {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 800,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
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
    const easyBotResponse = data.content[0].text

    // Parse the move from EasyBot's response (simple extraction)
    const move = extractMoveFromResponse(easyBotResponse)

    // Update usage statistics
    const now = new Date()
    const { data: usageData } = await supabase
      .from('user_analytics')
      .select('easybot_requests_today')
      .eq('user_id', user.id)
      .single()

    await supabase
      .from('user_analytics')
      .upsert({
        user_id: user.id,
        date: now.toISOString().split('T')[0],
        easybot_requests_today: (usageData?.easybot_requests_today || 0) + 1
      }, {
        onConflict: 'user_id,date'
      })

    // Return EasyBot move and explanation
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({
        success: true,
        data: {
          move: move,
          explanation: easyBotResponse,
          aiService: 'easybot',
          model: 'claude-3-5-sonnet-20241022',
          difficulty: difficulty || 'EASY',
          learningFocus: 'Basic concepts and safe play'
        }
      })
    }

  } catch (error) {
    console.error('EasyBot error:', error)

    // Fallback simple move logic for complete failure
    const fallbackMove = generateFallbackMove(dice)

    return {
      statusCode: 200, // Return success with fallback
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          move: fallbackMove,
          explanation: "EasyBot made a simple safe move to help you learn. This prioritizes safety over complex strategy.",
          aiService: 'easybot-fallback',
          model: 'simple-logic',
          difficulty: 'EASY'
        }
      })
    }
  }
}

// Helper function to create simple board description
function createSimpleBoardDescription(boardState, dice, playerColor) {
  // Simplified board description for beginners
  const points = boardState.points || []

  let description = `Board position (${playerColor}'s turn):\n`

  // Count checkers on key points
  const whiteHomeBoard = points.slice(0, 6).reduce((sum, count) => sum + count, 0)
  const blackHomeBoard = points.slice(18, 24).reduce((sum, count) => sum + count, 0)

  description += `- White has ${whiteHomeBoard} checkers in home board (points 1-6)\n`
  description += `- Black has ${blackHomeBoard} checkers in home board (points 19-24)\n`

  if (boardState.bar?.white > 0) {
    description += `- White has ${boardState.bar.white} checker(s) on the bar\n`
  }
  if (boardState.bar?.black > 0) {
    description += `- Black has ${boardState.bar.black} checker(s) on the bar\n`
  }

  return description
}

// Extract move from EasyBot response (simplified parsing)
function extractMoveFromResponse(response) {
  // Look for common move notation patterns
  const movePatterns = [
    /(\d+)\/(\d+)/g,  // Standard notation like 24/20
    /from (\d+) to (\d+)/gi,  // "from X to Y"
    /move.*?\b(\d+)\b.*?\b(\d+)\b/gi  // "move from X to Y"
  ]

  for (const pattern of movePatterns) {
    const matches = response.match(pattern)
    if (matches && matches.length > 0) {
      // Return first match as simplified move
      return matches[0]
    }
  }

  // Fallback to generic safe move
  return "Safe home board move"
}

// Generate fallback simple move
function generateFallbackMove(dice) {
  if (!dice || dice.length === 0) return "No dice available"

  // Simple safe moves for beginners
  const safeMoves = [
    "24/20 (safe 4-point move)",
    "6/3 (simple home board move)",
    "8/5 (standard opening move)",
    "13/10 (safe middle move)"
  ]

  return safeMoves[Math.floor(Math.random() * safeMoves.length)]
}
