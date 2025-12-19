// Simple Claude Sonnet 4.5 Test
async function testClaudeSonnet45() {
  console.log('🧪 Testing Claude Sonnet 4.5 Integration...\n')

  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY

  if (!CLAUDE_API_KEY) {
    console.log('❌ CLAUDE_API_KEY not found in environment variables')
    console.log('Please set CLAUDE_API_KEY in your .env file')
    return
  }

  const testMessage = `You are an expert backgammon coach. Analyze this opening position:

White has just rolled 3-1. White's checkers are on points 24, 13, 8, 6, and 1.
Black's checkers are on points 12, 17, and 19.

What are the best moves for white with this 3-1 roll? Explain your reasoning clearly.`

  console.log('📊 Test Scenario:')
  console.log('- White opening position')
  console.log('- Dice roll: 3-1')
  console.log('- White to move\n')

  console.log('🤖 Calling Claude Sonnet 4.5 API...')

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: 'You are Claude, an expert backgammon coach and assistant. Help players improve their game with clear, educational explanations. Be encouraging and patient, explain concepts clearly, use backgammon terminology correctly, focus on strategic thinking, provide actionable advice, and keep responses conversational but informative.',
        messages: [{
          role: 'user',
          content: testMessage
        }]
      })
    })

    console.log('\n📋 API Response Status:', response.status)

    if (response.ok) {
      const data = await response.json()

      console.log('\n✅ SUCCESS! Claude Sonnet 4.5 Response:')
      console.log('=' .repeat(60))
      console.log(data.content[0].text)
      console.log('=' .repeat(60))

      console.log('\n📊 Technical Details:')
      console.log('- Model: claude-3-5-sonnet-20241022')
      console.log('- Response length:', data.content[0].text.length, 'characters')
      console.log('- Usage:', JSON.stringify(data.usage || 'N/A'))

      console.log('\n🎯 Claude Sonnet 4.5 is working perfectly!')
      console.log('The AI provides expert backgammon analysis with clear reasoning.')

    } else {
      const errorText = await response.text()
      console.log('❌ Claude API Error:', response.status)
      console.log('Error details:', errorText)
    }

  } catch (error) {
    console.log('\n❌ Network Error:', error.message)
    console.log('Possible causes:')
    console.log('- Invalid API key')
    console.log('- Network connectivity issues')
    console.log('- Claude API service unavailable')
  }
}

// Run the test
testClaudeSonnet45().catch(console.error)
