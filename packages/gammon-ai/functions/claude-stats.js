const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

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

    // Get usage statistics
    const { data: usageData, error: usageError } = await supabase
      .from('user_analytics')
      .select(`
        claude_requests_today,
        claude_requests_this_month,
        claude_quota_remaining
      `)
      .eq('user_id', user.id)
      .single()

    if (usageError && usageError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Stats query error:', usageError)
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Failed to fetch usage statistics' })
      }
    }

    // Default values for new users
    const stats = usageData || {
      claude_requests_today: 0,
      claude_requests_this_month: 0,
      claude_quota_remaining: 10
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          requests_today: stats.claude_requests_today || 0,
          requests_this_month: stats.claude_requests_this_month || 0,
          quota_remaining: stats.claude_quota_remaining || 10,
          quota_total: 10 // Free tier
        }
      })
    }

  } catch (error) {
    console.error('Claude stats error:', error)

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
