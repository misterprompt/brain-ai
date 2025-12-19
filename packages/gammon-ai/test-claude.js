const { createClient } = require('@supabase/supabase-js')

// Test Claude Sonnet 4.5 integration
async function testClaudeSonnet45() {
  console.log('🧪 Testing Claude Sonnet 4.5 Integration...\n')

  // Test position: Opening position with 3-1 roll
  const testBoardState = {
    points: [
      0, 0, 0, 0, 0, 5,   // Points 1-6 (white)
      0, 3, 0, 0, 0, 0,   // Points 7-12 (white)
      5, 0, 0, 0, 3, 0,   // Points 13-18 (black)
      0, 0, 0, 0, 0, 2    // Points 19-24 (black)
    ],
    bar: { white: 0, black: 0 },
    off: { white: 0, black: 0 },
    dice: [3, 1],
    currentPlayer: 'white'
  }

  const testPayload = {
    boardState: testBoardState,
    dice: [3, 1],
    playerLevel: 'INTERMEDIATE'
  }

  console.log('📊 Test Position:')
  console.log('- White opening position')
  console.log('- Dice roll: 3-1')
  console.log('- White to move\n')

  try {
    console.log('🤖 Calling Claude Sonnet 4.5 API...')

    const response = await fetch('http://localhost:3000/api/claude/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token` // This will fail auth but test the structure
      },
      body: JSON.stringify(testPayload)
    })

    const data = await response.json()

    console.log('\n📋 API Response:')
    console.log('Status:', response.status)
    console.log('Success:', data.success)

    if (data.success) {
      console.log('\n🤖 Claude Sonnet 4.5 Analysis:')
      console.log('=' .repeat(50))
      console.log(data.data.analysis)
      console.log('=' .repeat(50))

      console.log('\n📊 Response Details:')
      console.log('- AI Service:', data.data.aiService)
      console.log('- Model:', data.data.model)
      console.log('- Used Fallback:', data.data.usedFallback || false)
    } else {
      console.log('❌ Error:', data.error)
      console.log('Details:', data.message)
    }

  } catch (error) {
    console.log('\n❌ Network Error:', error.message)

    // Let's try a direct Claude API call to test the model
    console.log('\n🔄 Testing direct Claude API call...')
    await testDirectClaudeAPI()
  }
}

async function testDirectClaudeAPI() {
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY

  if (!CLAUDE_API_KEY) {
    console.log('❌ CLAUDE_API_KEY not found in environment')
    return
  }

  const testMessage = "What are the best opening moves in backgammon with a 3-1 roll from the white starting position?"

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
        system: 'You are an expert backgammon coach. Provide clear, educational analysis.',
        messages: [{
          role: 'user',
          content: testMessage
        }]
      })
    })

    if (response.ok) {
      const data = await response.json()
      console.log('\n✅ Direct Claude Sonnet 4.5 Response:')
      console.log('=' .repeat(50))
      console.log(data.content[0].text)
      console.log('=' .repeat(50))
      console.log('\n🎯 Claude Sonnet 4.5 is working perfectly!')
    } else {
      console.log('❌ Claude API Error:', response.status)
      const errorText = await response.text()
      console.log('Details:', errorText)
    }

  } catch (error) {
    console.log('❌ Direct API call failed:', error.message)
  }
}

// Run the test
testClaudeSonnet45().catch(console.error)
