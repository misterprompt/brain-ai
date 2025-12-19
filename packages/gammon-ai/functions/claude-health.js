// Claude health check Netlify Function
exports.handler = async (event, context) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
      body: ''
    }
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY

    if (!CLAUDE_API_KEY) {
      return {
        statusCode: 503,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          data: {
            available: false,
            message: 'Claude API key not configured'
          }
        })
      }
    }

    // Simple health check - verify API key is set
    const isAvailable = CLAUDE_API_KEY && CLAUDE_API_KEY.length > 10

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          available: isAvailable,
          message: isAvailable ? 'Claude is available' : 'Claude is not configured'
        }
      })
    }

  } catch (error) {
    console.error('Claude health check error:', error)

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        data: {
          available: false,
          message: 'Health check failed'
        }
      })
    }
  }
}
