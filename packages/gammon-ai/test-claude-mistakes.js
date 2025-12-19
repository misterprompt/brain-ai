// Test Claude Mistake Analysis
async function testClaudeMistakeAnalysis() {
  console.log('🧪 Testing Claude Mistake Analysis...\n')

  // Sample game with a mistake
  const sampleGame = {
    gameMoves: [
      { move: "24/20 13/9", player: "white", dice: [4,4], explanation: "Opening doublets" },
      { move: "13/9 13/5", player: "black", dice: [4,4], explanation: "Black opening" },
      { move: "20/16 9/5", player: "white", dice: [4,4], explanation: "Continuing with 4s" },
      { move: "24/20 6/2*", player: "black", dice: [4,4], explanation: "Hitting white's blot" },
      { move: "bar/21 6/2", player: "white", dice: [5,4], explanation: "Re-entering and playing 6/2" }, // This might be the mistake!
      { move: "20/15 15/11", player: "black", dice: [5,4], explanation: "Black advances" }
    ],
    playerColor: "white",
    mistakeMoveIndex: 4 // The 5th move (0-indexed) where white played bar/21 6/2
  }

  console.log('📊 Test Game Scenario:')
  console.log('White vs Black backgammon game')
  console.log('Analyzing move at index 4: bar/21 6/2')
  console.log('This move might be suboptimal...\n')

  try {
    console.log('🤖 Calling Claude Mistake Analysis...')

    const response = await fetch('http://localhost:3000/api/claude/mistakes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token` // This will fail auth but test structure
      },
      body: JSON.stringify(sampleGame)
    })

    const data = await response.json()

    console.log('\n📋 API Response:')
    console.log('Status:', response.status)
    console.log('Success:', data.success)

    if (data.success) {
      console.log('\n🔍 Claude Mistake Analysis:')
      console.log('=' .repeat(60))

      if (data.data.analysis) {
        console.log('📝 Summary:', data.data.analysis.summary)
        console.log('\n🎯 Key Points:')
        data.data.analysis.keyPoints.forEach((point, i) => {
          console.log(`${i + 1}. ${point}`)
        })

        console.log('\n💡 Better Moves:')
        data.data.analysis.betterMoves.forEach((move, i) => {
          console.log(`${i + 1}. ${move}`)
        })

        console.log('\n📊 Equity Impact:', data.data.analysis.equityImpact)
        console.log('\n📚 Lesson:', data.data.analysis.lesson)
      }

      console.log('\n📈 Usage Info:')
      console.log('- Remaining quota:', data.data.usage.remaining)
      console.log('- AI Service:', data.data.aiService)
      console.log('- Model:', data.data.model)

      console.log('=' .repeat(60))
      console.log('\n✅ Claude Mistake Analysis is working!')

    } else {
      console.log('❌ Error:', data.error)
      console.log('Details:', data.message)
    }

  } catch (error) {
    console.log('\n❌ Network Error:', error.message)

    // Try direct Claude API call for testing
    console.log('\n🔄 Testing direct Claude API for mistake analysis...')
    await testDirectClaudeMistakes()
  }
}

async function testDirectClaudeMistakes() {
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY

  if (!CLAUDE_API_KEY) {
    console.log('❌ CLAUDE_API_KEY not found in environment')
    return
  }

  const mistakeAnalysisPrompt = `Analyze this backgammon mistake:

Game moves:
1. White: 24/20 13/9 (opening with double 4s)
2. Black: 13/9 13/5 (black opening)  
3. White: 20/16 9/5 (continuing with 4s)
4. Black: 24/20 6/2* (black hits white's blot on 2-point)
5. White: bar/21 6/2 (re-entering and playing 6/2) ← MISTAKE TO ANALYZE

Question: Was white's move "bar/21 6/2" a mistake? Why or why not? What would be better?`

  try {
    console.log('🤖 Calling Claude API directly for mistake analysis...')

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
        system: 'You are an expert backgammon analyst. Analyze the mistake in the given move and provide clear, educational feedback.',
        messages: [{
          role: 'user',
          content: mistakeAnalysisPrompt
        }]
      })
    })

    if (response.ok) {
      const data = await response.json()

      console.log('\n✅ SUCCESS! Direct Claude Mistake Analysis:')
      console.log('=' .repeat(60))
      console.log(data.content[0].text)
      console.log('=' .repeat(60))

      console.log('\n📊 Technical Details:')
      console.log('- Model: claude-3-5-sonnet-20241022')
      console.log('- Analysis length:', data.content[0].text.length, 'characters')
      console.log('- Usage:', JSON.stringify(data.usage || 'N/A'))

      console.log('\n🎯 Claude Mistake Analysis is fully functional!')

    } else {
      const errorText = await response.text()
      console.log('❌ Claude API Error:', response.status)
      console.log('Details:', errorText)
    }

  } catch (error) {
    console.log('❌ Direct API call failed:', error.message)
  }
}

// Run the test
testClaudeMistakeAnalysis().catch(console.error)
